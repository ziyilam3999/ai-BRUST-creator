#Requires -Modules Pester
<#
.SYNOPSIS
    Pester tests for Sync-DocsNewestWins function in sync_copilot_instructions.ps1

.DESCRIPTION
    Tests the file-level newest-wins sync strategy.
    Run with: Invoke-Pester -Path .\tools\tests\

.NOTES
    Version: 1.1.0
    Created: 2026-01-20
    Updated: 2026-01-25 - Added garbage filter and BackupOnly tests
#>

# Garbage filename filter (matches main script v2.14.0)
$script:GARBAGE_FILENAME_PATTERN = '^(\.md|ap\.md|d|ects\.md|ements\.md|evolution\.md|g\.md|ion\.md|log\.md|md|ngelog\.md|oring\.md|s\.md|tocol-changelog\.md|tocol-evolution\.md|actoring\.md|e-map\.md|lution\.md|ng\.md|nts\.md|ol-changelog\.md|ol-evolution\.md|ting\.md|uirements\.md)$'

# Define Sync-DocsNewestWins function for testing (simplified version)
function Sync-DocsNewestWins {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$SourcePath,
        
        [Parameter(Mandatory)]
        [string]$TargetPath,
        
        [string[]]$ExcludeFiles = @(".doc-version.yaml"),
        
        [switch]$BackupOnly
    )
    
    $syncResults = @{
        SourceToTarget = @()
        TargetToSource = @()
        Skipped = @()
    }
    
    # Get all files from both directories (recursively)
    $sourceFiles = @{}
    $targetFiles = @{}
    
    if (Test-Path $SourcePath) {
        Get-ChildItem -Path $SourcePath -File -Recurse | ForEach-Object {
            $relativePath = $_.FullName.Substring($SourcePath.Length).TrimStart('\', '/')
            # Skip garbage/malformed filenames and excluded files
            if ($relativePath -notin $ExcludeFiles -and ($_.Name -notin $ExcludeFiles) -and ($_.Name -notmatch $script:GARBAGE_FILENAME_PATTERN)) {
                $sourceFiles[$relativePath] = $_
            }
        }
    }
    
    if (Test-Path $TargetPath) {
        Get-ChildItem -Path $TargetPath -File -Recurse | ForEach-Object {
            $relativePath = $_.FullName.Substring($TargetPath.Length).TrimStart('\', '/')
            # Skip garbage/malformed filenames and excluded files
            if ($relativePath -notin $ExcludeFiles -and ($_.Name -notin $ExcludeFiles) -and ($_.Name -notmatch $script:GARBAGE_FILENAME_PATTERN)) {
                $targetFiles[$relativePath] = $_
            }
        }
    }
    
    # Get union of all file paths
    $allFiles = @($sourceFiles.Keys) + @($targetFiles.Keys) | Select-Object -Unique
    
    foreach ($relativePath in $allFiles) {
        $sourceFile = $sourceFiles[$relativePath]
        $targetFile = $targetFiles[$relativePath]
        
        $sourceFullPath = Join-Path $SourcePath $relativePath
        $targetFullPath = Join-Path $TargetPath $relativePath
        
        if ($sourceFile -and -not $targetFile) {
            # File only in source → copy to target
            $targetDir = Split-Path $targetFullPath -Parent
            if (-not (Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }
            Copy-Item -Path $sourceFile.FullName -Destination $targetFullPath -Force
            $syncResults.SourceToTarget += $relativePath
        }
        elseif (-not $sourceFile -and $targetFile) {
            # File only in target
            if ($BackupOnly) {
                # BackupOnly mode: do NOT copy target-only files back to source
                $syncResults.Skipped += $relativePath
            } else {
                # Bidirectional mode: copy to source
                $sourceDir = Split-Path $sourceFullPath -Parent
                if (-not (Test-Path $sourceDir)) {
                    New-Item -ItemType Directory -Path $sourceDir -Force | Out-Null
                }
                Copy-Item -Path $targetFile.FullName -Destination $sourceFullPath -Force
                $syncResults.TargetToSource += $relativePath
            }
        }
        elseif ($sourceFile -and $targetFile) {
            # File in both → compare timestamps, newest wins
            $sourceTime = $sourceFile.LastWriteTime
            $targetTime = $targetFile.LastWriteTime
            
            # Use 1-second tolerance to avoid filesystem timestamp precision issues
            $timeDiff = ($sourceTime - $targetTime).TotalSeconds
            
            if ($timeDiff -gt 1) {
                # Source is newer → copy to target
                Copy-Item -Path $sourceFile.FullName -Destination $targetFullPath -Force
                $syncResults.SourceToTarget += $relativePath
            }
            elseif ($timeDiff -lt -1) {
                # Target is newer → copy to source
                Copy-Item -Path $targetFile.FullName -Destination $sourceFullPath -Force
                $syncResults.TargetToSource += $relativePath
            }
            else {
                # Within tolerance → skip
                $syncResults.Skipped += $relativePath
            }
        }
    }
    
    return $syncResults
}

# Create temp directories for tests
$script:TempDir = Join-Path $env:TEMP "PesterSyncTests_$(Get-Random)"
$script:SourceDir = Join-Path $script:TempDir "source"
$script:TargetDir = Join-Path $script:TempDir "target"

Describe "Sync-DocsNewestWins" {
    
    BeforeEach {
        # Clean and recreate directories before each test
        if (Test-Path $script:TempDir) {
            Remove-Item $script:TempDir -Recurse -Force
        }
        New-Item -ItemType Directory -Path $script:SourceDir -Force | Out-Null
        New-Item -ItemType Directory -Path $script:TargetDir -Force | Out-Null
    }
    
    Context "File only in source" {
        
        It "Should copy source-only file to target" {
            # Setup
            $sourceFile = Join-Path $script:SourceDir "readme.md"
            "Source content" | Set-Content $sourceFile
            
            # Act
            $result = Sync-DocsNewestWins -SourcePath $script:SourceDir -TargetPath $script:TargetDir
            
            # Assert
            $result.SourceToTarget -contains "readme.md" | Should Be $true
            $targetFile = Join-Path $script:TargetDir "readme.md"
            Test-Path $targetFile | Should Be $true
            Get-Content $targetFile | Should Be "Source content"
        }
        
        It "Should create subdirectories as needed" {
            # Setup
            $subDir = Join-Path $script:SourceDir "features"
            New-Item -ItemType Directory -Path $subDir -Force | Out-Null
            $sourceFile = Join-Path $subDir "spec.md"
            "Feature spec" | Set-Content $sourceFile
            
            # Act
            $result = Sync-DocsNewestWins -SourcePath $script:SourceDir -TargetPath $script:TargetDir
            
            # Assert
            $result.SourceToTarget -contains "features\spec.md" | Should Be $true
            $targetFile = Join-Path $script:TargetDir "features\spec.md"
            Test-Path $targetFile | Should Be $true
        }
    }
    
    Context "File only in target" {
        
        It "Should copy target-only file to source" {
            # Setup
            $targetFile = Join-Path $script:TargetDir "changelog.md"
            "Target changelog" | Set-Content $targetFile
            
            # Act
            $result = Sync-DocsNewestWins -SourcePath $script:SourceDir -TargetPath $script:TargetDir
            
            # Assert
            $result.TargetToSource -contains "changelog.md" | Should Be $true
            $sourceFile = Join-Path $script:SourceDir "changelog.md"
            Test-Path $sourceFile | Should Be $true
            Get-Content $sourceFile | Should Be "Target changelog"
        }
    }
    
    Context "File in both - timestamp comparison" {
        
        It "Should copy newer source file to target" {
            # Setup
            $sourceFile = Join-Path $script:SourceDir "shared.md"
            $targetFile = Join-Path $script:TargetDir "shared.md"
            
            "Old target" | Set-Content $targetFile
            Start-Sleep -Seconds 2  # Ensure timestamp difference
            "New source" | Set-Content $sourceFile
            
            # Act
            $result = Sync-DocsNewestWins -SourcePath $script:SourceDir -TargetPath $script:TargetDir
            
            # Assert
            $result.SourceToTarget -contains "shared.md" | Should Be $true
            Get-Content $targetFile | Should Be "New source"
        }
        
        It "Should copy newer target file to source" {
            # Setup
            $sourceFile = Join-Path $script:SourceDir "shared.md"
            $targetFile = Join-Path $script:TargetDir "shared.md"
            
            "Old source" | Set-Content $sourceFile
            Start-Sleep -Seconds 2  # Ensure timestamp difference
            "New target" | Set-Content $targetFile
            
            # Act
            $result = Sync-DocsNewestWins -SourcePath $script:SourceDir -TargetPath $script:TargetDir
            
            # Assert
            $result.TargetToSource -contains "shared.md" | Should Be $true
            Get-Content $sourceFile | Should Be "New target"
        }
        
        It "Should skip files with same timestamp (within tolerance)" {
            # Setup
            $sourceFile = Join-Path $script:SourceDir "same.md"
            $targetFile = Join-Path $script:TargetDir "same.md"
            
            "Same content" | Set-Content $sourceFile
            Copy-Item $sourceFile $targetFile -Force
            
            # Act
            $result = Sync-DocsNewestWins -SourcePath $script:SourceDir -TargetPath $script:TargetDir
            
            # Assert
            $result.Skipped -contains "same.md" | Should Be $true
            $result.SourceToTarget -contains "same.md" | Should Be $false
            $result.TargetToSource -contains "same.md" | Should Be $false
        }
    }
    
    Context "Exclusions" {
        
        It "Should exclude specified files" {
            # Setup
            $sourceFile = Join-Path $script:SourceDir ".doc-version.yaml"
            "version: 1.0" | Set-Content $sourceFile
            
            # Act
            $result = Sync-DocsNewestWins -SourcePath $script:SourceDir -TargetPath $script:TargetDir
            
            # Assert
            $result.SourceToTarget -contains ".doc-version.yaml" | Should Be $false
            $targetFile = Join-Path $script:TargetDir ".doc-version.yaml"
            Test-Path $targetFile | Should Be $false
        }
        
        It "Should exclude custom files when specified" {
            # Setup
            $sourceFile = Join-Path $script:SourceDir "secret.txt"
            "Secret data" | Set-Content $sourceFile
            
            # Act
            $result = Sync-DocsNewestWins -SourcePath $script:SourceDir -TargetPath $script:TargetDir -ExcludeFiles @("secret.txt")
            
            # Assert
            $result.SourceToTarget -contains "secret.txt" | Should Be $false
        }
    }
    
    Context "Empty directories" {
        
        It "Should handle empty source directory" {
            # Act
            $result = Sync-DocsNewestWins -SourcePath $script:SourceDir -TargetPath $script:TargetDir
            
            # Assert
            $result.SourceToTarget.Count | Should Be 0
            $result.TargetToSource.Count | Should Be 0
        }
        
        It "Should handle non-existent source directory gracefully" {
            # Act
            $result = Sync-DocsNewestWins -SourcePath "C:\nonexistent\path" -TargetPath $script:TargetDir
            
            # Assert - should not throw
            $result | Should Not BeNullOrEmpty
        }
    }
    
    Context "Garbage filename filter" {
        
        It "Should skip garbage files like .md" {
            # Setup
            $garbageFile = Join-Path $script:SourceDir ".md"
            "Garbage content" | Set-Content $garbageFile
            
            # Act
            $result = Sync-DocsNewestWins -SourcePath $script:SourceDir -TargetPath $script:TargetDir
            
            # Assert
            $result.SourceToTarget -contains ".md" | Should Be $false
            $targetFile = Join-Path $script:TargetDir ".md"
            Test-Path $targetFile | Should Be $false
        }
        
        It "Should skip truncated filenames like ects.md" {
            # Setup
            $garbageFile = Join-Path $script:SourceDir "ects.md"
            "Truncated defects" | Set-Content $garbageFile
            
            # Act
            $result = Sync-DocsNewestWins -SourcePath $script:SourceDir -TargetPath $script:TargetDir
            
            # Assert
            $result.SourceToTarget -contains "ects.md" | Should Be $false
        }
        
        It "Should sync valid files while skipping garbage" {
            # Setup
            $validFile = Join-Path $script:SourceDir "defects.md"
            $garbageFile = Join-Path $script:SourceDir "ects.md"
            "Valid defects" | Set-Content $validFile
            "Garbage" | Set-Content $garbageFile
            
            # Act
            $result = Sync-DocsNewestWins -SourcePath $script:SourceDir -TargetPath $script:TargetDir
            
            # Assert
            $result.SourceToTarget -contains "defects.md" | Should Be $true
            $result.SourceToTarget -contains "ects.md" | Should Be $false
        }
    }
    
    Context "BackupOnly mode" {
        
        It "Should NOT copy target-only files back to source in BackupOnly mode" {
            # Setup
            $targetFile = Join-Path $script:TargetDir "target-only.md"
            "Target only content" | Set-Content $targetFile
            
            # Act
            $result = Sync-DocsNewestWins -SourcePath $script:SourceDir -TargetPath $script:TargetDir -BackupOnly
            
            # Assert
            $result.TargetToSource.Count | Should Be 0
            $result.Skipped -contains "target-only.md" | Should Be $true
            $sourceFile = Join-Path $script:SourceDir "target-only.md"
            Test-Path $sourceFile | Should Be $false
        }
        
        It "Should still copy source files to target in BackupOnly mode" {
            # Setup
            $sourceFile = Join-Path $script:SourceDir "source-only.md"
            "Source content" | Set-Content $sourceFile
            
            # Act
            $result = Sync-DocsNewestWins -SourcePath $script:SourceDir -TargetPath $script:TargetDir -BackupOnly
            
            # Assert
            $result.SourceToTarget -contains "source-only.md" | Should Be $true
            $targetFile = Join-Path $script:TargetDir "source-only.md"
            Test-Path $targetFile | Should Be $true
        }
        
        It "Should copy target-only files in bidirectional mode (default)" {
            # Setup
            $targetFile = Join-Path $script:TargetDir "target-only.md"
            "Target content" | Set-Content $targetFile
            
            # Act (no -BackupOnly switch)
            $result = Sync-DocsNewestWins -SourcePath $script:SourceDir -TargetPath $script:TargetDir
            
            # Assert
            $result.TargetToSource -contains "target-only.md" | Should Be $true
            $sourceFile = Join-Path $script:SourceDir "target-only.md"
            Test-Path $sourceFile | Should Be $true
        }
    }
}

# Cleanup temp directory
if (Test-Path $script:TempDir) {
    Remove-Item $script:TempDir -Recurse -Force
}
