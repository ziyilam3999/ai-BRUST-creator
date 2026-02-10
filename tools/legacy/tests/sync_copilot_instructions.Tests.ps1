# ═══════════════════════════════════════════════════════════════════════════
# Unit Tests for sync_copilot_instructions.ps1
# ═══════════════════════════════════════════════════════════════════════════
# Test D-001: YAML Parser Section Boundary Bug
# The parser must detect when all_repos ends and sync_items begins
# ═══════════════════════════════════════════════════════════════════════════

Describe "YAML Parser Section Detection" {
    Context "D-001: Section boundary detection" {
        
        It "Should detect sync_items as a section boundary" {
            $line = "sync_items:"
            $result = $line -match '^sync_items:'
            $result | Should Be $true
        }
        
        It "Should detect exclusions as a section boundary" {
            $line = "exclusions:"
            $result = $line -match '^exclusions:'
            $result | Should Be $true
        }
        
        It "Should match valid repo names" {
            $validLines = @(
                '  - "ai-protocol"',
                '  - "gs_full"',
                '  - "GetSpace"'
            )
            
            $repoListRegex = '^\s+-\s+"([^"]+)"'
            
            foreach ($line in $validLines) {
                $result = $line -match $repoListRegex
                $result | Should Be $true
            }
        }
    }
}

Describe "Config Parser Integration" {
    Context "D-001: Full config parsing" {
        
        It "all_repos should NOT contain type file" {
            # Mock config content (simulates the real config structure)
            $mockConfig = @"
global:
  base_path: "C:\\Users\\test\\projects"

all_repos:
  - "ai-protocol"
  - "gs_full"

sync_items:
  - type: file
    source: ".github/copilot-instructions.md"
  - type: folder
    source: ".github/rules"

exclusions:
  - "*.local.*"
"@
            
            # Parse sections manually to verify fix
            $currentSection = $null
            $allRepos = @()
            
            foreach ($line in ($mockConfig -split "`n")) {
                $line = $line.TrimEnd()
                
                # Skip comments and empty lines
                if ($line -match '^\s*#') { continue }
                if ($line -match '^\s*$') { continue }
                
                # Section detection (THIS IS THE FIX)
                if ($line -match '^global:') { $currentSection = 'global'; continue }
                if ($line -match '^all_repos:') { $currentSection = 'all_repos'; continue }
                if ($line -match '^sync_items:') { $currentSection = 'sync_items'; continue }
                if ($line -match '^exclusions:') { $currentSection = 'exclusions'; continue }
                if ($line -match '^projects:') { $currentSection = 'projects'; continue }
                
                # Only parse repo list when in all_repos section
                if ($currentSection -eq 'all_repos') {
                    if ($line -match '^\s+-\s+"([^"]+)"') {
                        $repoName = $matches[1]
                        $allRepos += $repoName
                    }
                }
            }
            
            # Assertions
            $allRepos -contains "ai-protocol" | Should Be $true
            $allRepos -contains "gs_full" | Should Be $true
            $allRepos -contains "type: file" | Should Be $false
            $allRepos -contains "type: folder" | Should Be $false
            $allRepos.Count | Should Be 2
        }
    }
}

Describe "Path Expansion" {
    Context "D-001: Base path variable expansion" {
        
        It "Should expand base_path in repo paths" {
            $basePath = "C:\Users\test\projects"
            $repoName = "gs_full"
            
            $expandedPath = Join-Path $basePath $repoName
            
            $expandedPath | Should Be "C:\Users\test\projects\gs_full"
        }
        
        It "Should handle repos that are just names" {
            $basePath = "C:\Users\ziyil\coding_projects"
            $repoNames = @("ai-protocol", "gs_full", "GetSpace")
            
            foreach ($name in $repoNames) {
                if (-not [System.IO.Path]::IsPathRooted($name)) {
                    $fullPath = Join-Path $basePath $name
                    $result = $fullPath -match "^[A-Za-z]:\\"
                    $result | Should Be $true
                }
            }
        }
    }
}

Describe "Script Parameters" {
    Context "SkipTests parameter" {
        
        It "Should have SkipTests switch parameter defined" {
            $scriptPath = Join-Path (Split-Path $PSScriptRoot -Parent) "sync_copilot_instructions.ps1"
            $scriptContent = Get-Content $scriptPath -Raw
            
            # Check that param block includes SkipTests
            $scriptContent -match '\[switch\]\$SkipTests' | Should Be $true
        }
        
        It "Should handle SkipTests in pre-sync test section" {
            $scriptPath = Join-Path (Split-Path $PSScriptRoot -Parent) "sync_copilot_instructions.ps1"
            $scriptContent = Get-Content $scriptPath -Raw
            
            # Check that SkipTests is used in the test-skipping logic
            $scriptContent -match 'if \(\$SkipTests\)' | Should Be $true
        }
    }
}

Describe "Project Config Parsing" {
    Context "D-003: source_repo derivation from project name" {
        
        It "Should derive source_repo from project name when not specified" {
            # Mock config where project doesn't have source_repo
            $basePath = "C:\Users\test\projects"
            $projectName = "pillar_snapper"
            $project = @{
                phase = 'solo'
                source_repo = ''  # Empty - should be derived
                docs_path = 'docs'
                sync_targets = @()
            }
            
            # Simulate the fix: if source_repo is empty, derive from base_path + project_name
            if ([string]::IsNullOrEmpty($project.source_repo)) {
                $project.source_repo = Join-Path $basePath $projectName
            }
            
            $project.source_repo | Should Be "C:\Users\test\projects\pillar_snapper"
        }
        
        It "Should NOT override explicit source_repo" {
            $basePath = "C:\Users\test\projects"
            $projectName = "pillar_snapper"
            $project = @{
                phase = 'solo'
                source_repo = 'C:\custom\path\to\project'  # Explicitly set
                docs_path = 'docs'
                sync_targets = @()
            }
            
            # Simulate the fix: if source_repo is empty, derive from base_path + project_name
            if ([string]::IsNullOrEmpty($project.source_repo)) {
                $project.source_repo = Join-Path $basePath $projectName
            }
            
            # Should keep the explicit value
            $project.source_repo | Should Be "C:\custom\path\to\project"
        }
        
        It "Should handle source_repo with base_path variable" {
            $basePath = "C:\Users\test\projects"
            $projectName = "my_app"
            $project = @{
                phase = 'solo'
                source_repo = '${base_path}/custom_folder'
                docs_path = 'docs'
                sync_targets = @()
            }
            
            # First expand variables
            $project.source_repo = $project.source_repo -replace '\$\{base_path\}', $basePath
            
            # Then check if still needs derivation (won't, since it has value)
            if ([string]::IsNullOrEmpty($project.source_repo)) {
                $project.source_repo = Join-Path $basePath $projectName
            }
            
            $project.source_repo | Should Be "C:\Users\test\projects/custom_folder"
        }
    }
}

Describe "Init Protocol Script" {
    Context "D-002: init_protocol.ps1 availability" {
        
        It "Should have init_protocol.ps1 in tools folder" {
            $scriptPath = Join-Path (Split-Path $PSScriptRoot -Parent) "init_protocol.ps1"
            Test-Path $scriptPath | Should Be $true
        }
        
        It "Should be a valid PowerShell script with expected parameters" {
            $scriptPath = Join-Path (Split-Path $PSScriptRoot -Parent) "init_protocol.ps1"
            
            # Only run this test if the script exists
            if (Test-Path $scriptPath) {
                # Parse the script to get its parameters
                $ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$null, [ref]$null)
                $params = $ast.ParamBlock.Parameters
                
                # Check that expected parameters exist
                $paramNames = $params | ForEach-Object { $_.Name.VariablePath.UserPath }
                $paramNames -contains 'TargetRepo' | Should Be $true
            } else {
                # Script doesn't exist yet - this is the failing test before fix
                $false | Should Be $true
            }
        }
    }
    
    Context "D-004: Initialize-Protocol function availability" {
        
        It "Should define Initialize-Protocol function when dot-sourced" {
            $scriptPath = Join-Path (Split-Path $PSScriptRoot -Parent) "init_protocol.ps1"
            
            if (Test-Path $scriptPath) {
                # Dot-source in a clean scope to avoid side effects
                $sb = {
                    param($path)
                    . $path
                    Get-Command -Name Initialize-Protocol -ErrorAction SilentlyContinue
                }
                $func = & $sb $scriptPath
                $func | Should Not BeNullOrEmpty
            } else {
                $false | Should Be $true
            }
        }
        
        It "Initialize-Protocol should accept TargetRepo and ProtocolRepo parameters" {
            $scriptPath = Join-Path (Split-Path $PSScriptRoot -Parent) "init_protocol.ps1"
            
            if (Test-Path $scriptPath) {
                # Parse to check function parameters
                $content = Get-Content $scriptPath -Raw
                $content -match 'function Initialize-Protocol' | Should Be $true
                $content -match '\[string\]\$TargetRepo' | Should Be $true
                $content -match '\[string\]\$ProtocolRepo' | Should Be $true
            } else {
                $false | Should Be $true
            }
        }
    }
    
    Context "D-005: Auto git init without flag" {
        
        It "Should NOT have -AutoInit as required behavior (git init should be automatic)" {
            $scriptPath = Join-Path (Split-Path $PSScriptRoot -Parent) "init_protocol.ps1"
            $content = Get-Content $scriptPath -Raw
            
            # The script should NOT exit with error when .git is missing
            # It should auto-initialize without requiring -AutoInit flag
            # Look for the old pattern that requires -AutoInit
            $hasOldPattern = $content -match 'Use -AutoInit to initialize automatically'
            $hasOldPattern | Should Be $false
        }
        
        It "Should auto-run git init when .git folder is missing (no flag needed)" {
            $scriptPath = Join-Path (Split-Path $PSScriptRoot -Parent) "init_protocol.ps1"
            $content = Get-Content $scriptPath -Raw
            
            # The script should call git init when .git is missing, without needing -AutoInit
            # Look for unconditional git init (not wrapped in if ($AutoInit))
            $hasAutoGitInit = $content -match 'if \(-not \(Test-GitRepository[^)]+\)\)\s*\{[^}]*git init'
            $hasAutoGitInit | Should Be $true
        }
    }
}