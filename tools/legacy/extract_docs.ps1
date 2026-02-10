#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Extracts documentation from code comments and generates/updates docs/*.md
.DESCRIPTION
    Parses @requirement, @tested, @changelog, @architecture, @defect, @refactor tags
    from source files (Dart, Python, Java, JS/TS, etc.) and updates documentation files.
    
    Supports multiple languages:
    - Dart/Flutter (.dart)
    - Python (.py)
    - Java (.java)
    - JavaScript/TypeScript (.js, .ts, .jsx, .tsx)
    - Generic (any file with recognized comment patterns)
    
.PARAMETER SourceDir
    The source directory to scan. Defaults to auto-detect based on project type.
.PARAMETER DocsDir
    The output directory for generated docs. Defaults to "docs".
.PARAMETER DryRun
    Preview changes without writing files.
.PARAMETER Verbose
    Show detailed output during processing.
.EXAMPLE
    .\tools\extract_docs.ps1
.EXAMPLE
    .\tools\extract_docs.ps1 -DryRun
.EXAMPLE
    .\tools\extract_docs.ps1 -SourceDir "src" -Verbose
.NOTES
    Author: Personal Dev Tools
    Version: 1.0.0
    Date: 2026-01-20
    
    Changelog:
    - 1.0.0: Initial release with multi-language support (Dart, Python, Java, JS/TS)
#>

param(
    [switch]$DryRun,
    [switch]$Verbose,
    [string]$SourceDir = "",
    [string]$DocsDir = "docs"
)

# Script version (update this when making changes)
$EXTRACT_DOCS_VERSION = [version]"1.0.0"

$ErrorActionPreference = "Stop"

# ============================================================================
# PROJECT TYPE DETECTION
# ============================================================================

function Get-ProjectType {
    $projectType = "generic"
    $sourceDir = "."
    
    # Flutter/Dart
    if (Test-Path "pubspec.yaml") {
        $projectType = "flutter"
        $sourceDir = "lib"
    }
    # Python
    elseif ((Test-Path "pyproject.toml") -or (Test-Path "setup.py") -or (Test-Path "requirements.txt")) {
        $projectType = "python"
        if (Test-Path "src") { $sourceDir = "src" }
        else { $sourceDir = "." }
    }
    # Java/Gradle
    elseif ((Test-Path "build.gradle") -or (Test-Path "build.gradle.kts") -or (Test-Path "pom.xml")) {
        $projectType = "java"
        if (Test-Path "src/main") { $sourceDir = "src/main" }
        elseif (Test-Path "src") { $sourceDir = "src" }
        else { $sourceDir = "." }
    }
    # Node.js/JavaScript/TypeScript
    elseif (Test-Path "package.json") {
        $projectType = "node"
        if (Test-Path "src") { $sourceDir = "src" }
        elseif (Test-Path "lib") { $sourceDir = "lib" }
        else { $sourceDir = "." }
    }
    
    return @{
        Type = $projectType
        SourceDir = $sourceDir
    }
}

# ============================================================================
# LANGUAGE-SPECIFIC PATTERNS
# ============================================================================

$languagePatterns = @{
    "dart" = @{
        Extensions = @(".dart")
        CommentPatterns = @(
            '^\s*///\s*@(\w+)\s+(.+)$'     # /// @tag value
            '^\s*//\s*@(\w+)\s+(.+)$'      # // @tag value
        )
        ClassPattern = '^\s*(class|mixin|extension|enum)\s+(\w+)'
        FunctionPattern = '^\s*(\w+)\s+(\w+)\s*\('
    }
    "python" = @{
        Extensions = @(".py")
        CommentPatterns = @(
            '^\s*#\s*@(\w+)\s+(.+)$'       # # @tag value
        )
        ClassPattern = '^\s*class\s+(\w+)'
        FunctionPattern = '^\s*def\s+(\w+)\s*\('
    }
    "java" = @{
        Extensions = @(".java")
        CommentPatterns = @(
            '^\s*\*\s*@(\w+)\s+(.+)$'      # * @tag value (inside /** */)
            '^\s*//\s*@(\w+)\s+(.+)$'      # // @tag value
        )
        ClassPattern = '^\s*(public\s+)?(class|interface|enum)\s+(\w+)'
        FunctionPattern = '^\s*(public|private|protected)?\s*\w+\s+(\w+)\s*\('
    }
    "javascript" = @{
        Extensions = @(".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs")
        CommentPatterns = @(
            '^\s*\*\s*@(\w+)\s+(.+)$'      # * @tag value (inside /** */)
            '^\s*//\s*@(\w+)\s+(.+)$'      # // @tag value
        )
        ClassPattern = '^\s*(export\s+)?(class|interface)\s+(\w+)'
        FunctionPattern = '^\s*(export\s+)?(async\s+)?function\s+(\w+)'
    }
}

# ============================================================================
# TAG DEFINITIONS
# ============================================================================

$tagDefinitions = @{
    "requirement"  = @{ Doc = "requirements.md"; Pattern = '^(REQ-\d+):\s*(.+)$' }
    "tested"       = @{ Doc = "testing.md"; Pattern = '^(.+)$' }
    "changelog"    = @{ Doc = "changelog.md"; Pattern = '^(\d{4}-\d{2}-\d{2}):\s*(.+)$' }
    "architecture" = @{ Doc = "code-map.md"; Pattern = '^(.+)$' }
    "defect"       = @{ Doc = "defects.md"; Pattern = '^(DEF-\d+):\s*(.+)$' }
    "refactor"     = @{ Doc = "refactoring.md"; Pattern = '^(.+)$' }
    "deprecated"   = @{ Doc = "code-map.md"; Pattern = '^(.+)$' }
}

# ============================================================================
# COLLECTION OBJECTS
# ============================================================================

$collections = @{
    requirements = [System.Collections.ArrayList]::new()
    tests = [System.Collections.ArrayList]::new()
    changelogs = [System.Collections.ArrayList]::new()
    architecture = [System.Collections.ArrayList]::new()
    defects = [System.Collections.ArrayList]::new()
    refactors = [System.Collections.ArrayList]::new()
    deprecated = [System.Collections.ArrayList]::new()
}

# ============================================================================
# FILE PROCESSING
# ============================================================================

function Get-LanguageConfig {
    param([string]$Extension)
    
    foreach ($lang in $languagePatterns.Keys) {
        if ($languagePatterns[$lang].Extensions -contains $Extension) {
            return $languagePatterns[$lang]
        }
    }
    
    # Default fallback for unknown extensions
    return @{
        Extensions = @($Extension)
        CommentPatterns = @(
            '^\s*///\s*@(\w+)\s+(.+)$'
            '^\s*//\s*@(\w+)\s+(.+)$'
            '^\s*#\s*@(\w+)\s+(.+)$'
            '^\s*\*\s*@(\w+)\s+(.+)$'
        )
        ClassPattern = '(class|struct|type)\s+(\w+)'
        FunctionPattern = '(function|func|def|fn)\s+(\w+)'
    }
}

function Get-ContextName {
    param(
        [string[]]$Lines,
        [int]$StartLine,
        [hashtable]$LangConfig
    )
    
    for ($j = $StartLine; $j -lt $Lines.Count; $j++) {
        $line = $Lines[$j]
        
        # Skip comment lines
        if ($line -match '^\s*(///|//|#|\*|/\*|\*/)') {
            continue
        }
        
        # Try class pattern
        if ($LangConfig.ClassPattern -and $line -match $LangConfig.ClassPattern) {
            # Return last capture group (the name)
            return $matches[$matches.Count - 1]
        }
        
        # Try function pattern
        if ($LangConfig.FunctionPattern -and $line -match $LangConfig.FunctionPattern) {
            return $matches[$matches.Count - 1]
        }
        
        # If we hit a non-empty, non-comment line without a match, stop
        if ($line.Trim() -ne "") {
            break
        }
    }
    
    return "Unknown"
}

function Process-File {
    param(
        [string]$FilePath,
        [string]$RelativePath
    )
    
    $extension = [System.IO.Path]::GetExtension($FilePath).ToLower()
    $langConfig = Get-LanguageConfig -Extension $extension
    
    $lines = Get-Content $FilePath
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        
        foreach ($pattern in $langConfig.CommentPatterns) {
            if ($line -match $pattern) {
                $tagName = $matches[1].ToLower()
                $tagValue = $matches[2].Trim()
                
                if ($tagDefinitions.ContainsKey($tagName)) {
                    $contextName = Get-ContextName -Lines $lines -StartLine ($i + 1) -LangConfig $langConfig
                    
                    $entry = [PSCustomObject]@{
                        Tag = $tagName
                        Value = $tagValue
                        File = $RelativePath
                        Context = $contextName
                        Line = $i + 1
                    }
                    
                    # Parse tag-specific data
                    switch ($tagName) {
                        "requirement" {
                            if ($tagValue -match $tagDefinitions[$tagName].Pattern) {
                                $entry | Add-Member -NotePropertyName "ID" -NotePropertyValue $matches[1]
                                $entry | Add-Member -NotePropertyName "Description" -NotePropertyValue $matches[2]
                            }
                            $null = $collections.requirements.Add($entry)
                        }
                        "tested" {
                            $entry | Add-Member -NotePropertyName "TestFile" -NotePropertyValue $tagValue
                            $null = $collections.tests.Add($entry)
                        }
                        "changelog" {
                            if ($tagValue -match $tagDefinitions[$tagName].Pattern) {
                                $entry | Add-Member -NotePropertyName "Date" -NotePropertyValue $matches[1]
                                $entry | Add-Member -NotePropertyName "Description" -NotePropertyValue $matches[2]
                            }
                            $null = $collections.changelogs.Add($entry)
                        }
                        "architecture" {
                            $entry | Add-Member -NotePropertyName "Description" -NotePropertyValue $tagValue
                            $null = $collections.architecture.Add($entry)
                        }
                        "defect" {
                            if ($tagValue -match $tagDefinitions[$tagName].Pattern) {
                                $entry | Add-Member -NotePropertyName "ID" -NotePropertyValue $matches[1]
                                $entry | Add-Member -NotePropertyName "Description" -NotePropertyValue $matches[2]
                            }
                            $null = $collections.defects.Add($entry)
                        }
                        "refactor" {
                            $entry | Add-Member -NotePropertyName "Description" -NotePropertyValue $tagValue
                            $null = $collections.refactors.Add($entry)
                        }
                        "deprecated" {
                            $entry | Add-Member -NotePropertyName "Replacement" -NotePropertyValue $tagValue
                            $null = $collections.deprecated.Add($entry)
                        }
                    }
                    
                    if ($Verbose) {
                        Write-Host "  Found @$tagName in ${RelativePath}:$($i + 1)" -ForegroundColor DarkGray
                    }
                }
                break  # Only match first pattern per line
            }
        }
    }
}

# ============================================================================
# DOCUMENT GENERATORS
# ============================================================================

function Generate-CodeMap {
    param([string]$SourceDirectory, [string]$ProjectType)
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $content = @"
# Code Map
<!-- AUTO-GENERATED by extract_docs.ps1 - DO NOT EDIT MANUALLY -->
<!-- Last updated: $timestamp -->
<!-- Project type: $ProjectType -->

## Project Structure

"@
    
    # Build directory tree
    if (Test-Path $SourceDirectory) {
        $dirs = Get-ChildItem -Path $SourceDirectory -Directory -Recurse -ErrorAction SilentlyContinue | Sort-Object FullName
        foreach ($dir in $dirs) {
            $relativePath = $dir.FullName.Replace((Get-Location).Path, "").TrimStart("\", "/")
            $depth = ($relativePath.Split([IO.Path]::DirectorySeparatorChar).Count) - 1
            $indent = "  " * [Math]::Max(0, $depth)
            $content += "$indent- **$($dir.Name)/**`n"
        }
    }
    
    # Architecture section
    if ($collections.architecture.Count -gt 0) {
        $content += @"

## Architecture Notes

| Component | Location | Description |
|-----------|----------|-------------|
"@
        foreach ($arch in $collections.architecture) {
            $content += "| $($arch.Context) | [$($arch.File)]($($arch.File)#L$($arch.Line)) | $($arch.Description) |`n"
        }
    }
    
    # Deprecated section
    if ($collections.deprecated.Count -gt 0) {
        $content += @"

## Deprecated Items

| Component | Location | Replacement |
|-----------|----------|-------------|
"@
        foreach ($dep in $collections.deprecated) {
            $content += "| $($dep.Context) | [$($dep.File)]($($dep.File)#L$($dep.Line)) | $($dep.Replacement) |`n"
        }
    }
    
    return $content
}

function Generate-Requirements {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $content = @"
# Requirements
<!-- AUTO-GENERATED by extract_docs.ps1 - DO NOT EDIT MANUALLY -->
<!-- Last updated: $timestamp -->

## Features

| ID | Description | Location | Tested |
|----|-------------|----------|--------|
"@
    
    $sortedReqs = $collections.requirements | Where-Object { $_.ID } | Sort-Object ID
    foreach ($req in $sortedReqs) {
        $testLink = ($collections.tests | Where-Object { $_.File -eq $req.File -and $_.Context -eq $req.Context } | Select-Object -First 1).TestFile
        $testStatus = if ($testLink) { "[$testLink]($testLink)" } else { "❌ Missing" }
        $content += "| $($req.ID) | $($req.Description) | [$($req.Context)]($($req.File)#L$($req.Line)) | $testStatus |`n"
    }
    
    return $content
}

function Generate-Testing {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $content = @"
# Testing
<!-- AUTO-GENERATED by extract_docs.ps1 - DO NOT EDIT MANUALLY -->
<!-- Last updated: $timestamp -->

## Coverage Map

| Source | Test | Component |
|--------|------|-----------|
"@
    
    $sortedTests = $collections.tests | Sort-Object File
    foreach ($test in $sortedTests) {
        $content += "| [$($test.File)]($($test.File)#L$($test.Line)) | [$($test.TestFile)]($($test.TestFile)) | $($test.Context) |`n"
    }
    
    return $content
}

function Generate-Changelog {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $content = @"
# Changelog
<!-- AUTO-GENERATED by extract_docs.ps1 - DO NOT EDIT MANUALLY -->
<!-- Last updated: $timestamp -->

"@
    
    $grouped = $collections.changelogs | Where-Object { $_.Date } | Group-Object Date | Sort-Object Name -Descending
    foreach ($group in $grouped) {
        $content += "## $($group.Name)`n`n"
        foreach ($item in $group.Group) {
            $content += "- **$($item.Context)**: $($item.Description) ([$($item.File)]($($item.File)#L$($item.Line)))`n"
        }
        $content += "`n"
    }
    
    if ($collections.changelogs.Count -eq 0) {
        $content += "_No changelog entries found. Add @changelog tags to your code._`n"
    }
    
    return $content
}

function Generate-Defects {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $content = @"
# Defects
<!-- AUTO-GENERATED by extract_docs.ps1 - DO NOT EDIT MANUALLY -->
<!-- Last updated: $timestamp -->

## Known Issues

| ID | Description | Location |
|----|-------------|----------|
"@
    
    $sortedDefects = $collections.defects | Where-Object { $_.ID } | Sort-Object ID
    foreach ($defect in $sortedDefects) {
        $content += "| $($defect.ID) | $($defect.Description) | [$($defect.Context)]($($defect.File)#L$($defect.Line)) |`n"
    }
    
    if ($collections.defects.Count -eq 0) {
        $content += "| - | _No known defects_ | - |`n"
    }
    
    return $content
}

function Generate-Refactoring {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $content = @"
# Refactoring Log
<!-- AUTO-GENERATED by extract_docs.ps1 - DO NOT EDIT MANUALLY -->
<!-- Last updated: $timestamp -->

## History

| Component | Reason | Location |
|-----------|--------|----------|
"@
    
    foreach ($ref in $collections.refactors) {
        $content += "| $($ref.Context) | $($ref.Description) | [$($ref.File)]($($ref.File)#L$($ref.Line)) |`n"
    }
    
    if ($collections.refactors.Count -eq 0) {
        $content += "| - | _No refactoring notes_ | - |`n"
    }
    
    return $content
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Host "`n🔍 Extract Docs - Multi-Language Documentation Generator" -ForegroundColor Cyan
Write-Host "=" * 60

# Detect project type
$project = Get-ProjectType
$projectType = $project.Type
$detectedSourceDir = $project.SourceDir

# Use provided source dir or detected
if ($SourceDir -eq "") {
    $SourceDir = $detectedSourceDir
}

Write-Host "`n📂 Project type: $projectType" -ForegroundColor Yellow
Write-Host "📂 Source directory: $SourceDir" -ForegroundColor Yellow
Write-Host "📂 Docs directory: $DocsDir" -ForegroundColor Yellow

# Ensure docs directory exists
if (-not $DryRun -and -not (Test-Path $DocsDir)) {
    New-Item -ItemType Directory -Path $DocsDir -Force | Out-Null
    Write-Host "📁 Created docs directory: $DocsDir" -ForegroundColor Green
}

# Get all supported extensions
$allExtensions = @()
foreach ($lang in $languagePatterns.Values) {
    $allExtensions += $lang.Extensions
}
$allExtensions = $allExtensions | Select-Object -Unique

# Find all source files
$sourceFiles = @()
foreach ($ext in $allExtensions) {
    $pattern = "*$ext"
    $files = Get-ChildItem -Path $SourceDir -Filter $pattern -Recurse -ErrorAction SilentlyContinue
    $sourceFiles += $files
}

# Also scan test directories
$testDirs = @("test", "tests", "src/test", "src/tests")
foreach ($testDir in $testDirs) {
    if (Test-Path $testDir) {
        foreach ($ext in $allExtensions) {
            $pattern = "*$ext"
            $files = Get-ChildItem -Path $testDir -Filter $pattern -Recurse -ErrorAction SilentlyContinue
            $sourceFiles += $files
        }
    }
}

Write-Host "`n📄 Found $($sourceFiles.Count) source files to scan" -ForegroundColor Cyan

# Process each file
$processedCount = 0
foreach ($file in $sourceFiles) {
    $relativePath = $file.FullName.Replace((Get-Location).Path + [IO.Path]::DirectorySeparatorChar, "").Replace("\", "/")
    
    if ($Verbose) {
        Write-Host "Processing: $relativePath" -ForegroundColor DarkGray
    }
    
    Process-File -FilePath $file.FullName -RelativePath $relativePath
    $processedCount++
}

# Generate documents
$outputs = @{
    "code-map.md"     = Generate-CodeMap -SourceDirectory $SourceDir -ProjectType $projectType
    "requirements.md" = Generate-Requirements
    "testing.md"      = Generate-Testing
    "changelog.md"    = Generate-Changelog
    "defects.md"      = Generate-Defects
    "refactoring.md"  = Generate-Refactoring
}

Write-Host "`n📝 Generating documentation files..." -ForegroundColor Cyan

foreach ($file in $outputs.Keys) {
    $path = Join-Path $DocsDir $file
    if ($DryRun) {
        Write-Host "  Would write: $path" -ForegroundColor Yellow
        if ($Verbose) {
            Write-Host $outputs[$file] -ForegroundColor DarkGray
        }
    } else {
        $outputs[$file] | Out-File -FilePath $path -Encoding utf8 -NoNewline
        Write-Host "  ✅ Updated: $path" -ForegroundColor Green
    }
}

# Summary
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "📊 Extraction Summary:" -ForegroundColor Cyan
Write-Host "   Files scanned:      $processedCount"
Write-Host "   Requirements:       $($collections.requirements.Count)"
Write-Host "   Test mappings:      $($collections.tests.Count)"
Write-Host "   Changelog entries:  $($collections.changelogs.Count)"
Write-Host "   Architecture notes: $($collections.architecture.Count)"
Write-Host "   Defects:            $($collections.defects.Count)"
Write-Host "   Refactor notes:     $($collections.refactors.Count)"
Write-Host "   Deprecated items:   $($collections.deprecated.Count)"

if ($DryRun) {
    Write-Host "`n⚠️  DRY RUN - No files were modified" -ForegroundColor Yellow
} else {
    Write-Host "`n✅ Documentation updated successfully!" -ForegroundColor Green
}

Write-Host ""
