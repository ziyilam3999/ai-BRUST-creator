<#
.SYNOPSIS
    Pester tests for init_protocol.ps1
.DESCRIPTION
    TDD tests written BEFORE implementation.
    Run with: Invoke-Pester -Path .\tools\tests\InitProtocol.Tests.ps1
.NOTES
    Test-first approach: Write tests, run (all fail), implement, run (all pass)
    Compatible with Pester 3.x and 5.x
#>

# Global setup - runs before all tests
$env:PESTER_TESTING = '1'  # Prevent auto-execution when dot-sourcing init_protocol.ps1
$script:TempDir = Join-Path $env:TEMP "PesterInitTests_$(Get-Random)"
$script:ProtocolRepo = Join-Path $script:TempDir "ai-protocol"

# Create mock protocol repo structure
New-Item -ItemType Directory -Path "$script:ProtocolRepo\.github\rules" -Force | Out-Null
New-Item -ItemType Directory -Path "$script:ProtocolRepo\.claude\commands" -Force | Out-Null
New-Item -ItemType Directory -Path "$script:ProtocolRepo\tools\tests" -Force | Out-Null
New-Item -ItemType Directory -Path "$script:ProtocolRepo\docs\_templates\proposals" -Force | Out-Null

# Create mock protocol files
"mock copilot content" | Set-Content "$script:ProtocolRepo\.github\copilot-instructions.md"
"mock rule SCENARIOS" | Set-Content "$script:ProtocolRepo\.github\rules\SCENARIOS.md"
"mock rule GATES" | Set-Content "$script:ProtocolRepo\.github\rules\GATES.md"
"mock command commit" | Set-Content "$script:ProtocolRepo\.claude\commands\commit.md"
"mock command plan" | Set-Content "$script:ProtocolRepo\.claude\commands\plan.md"
'{"permissions":{}}' | Set-Content "$script:ProtocolRepo\.claude\settings.local.json"
"mock sync script" | Set-Content "$script:ProtocolRepo\tools\sync_copilot_instructions.ps1"
"mock extract script" | Set-Content "$script:ProtocolRepo\tools\extract_docs.ps1"
"mock test" | Set-Content "$script:ProtocolRepo\tools\tests\SomeTest.Tests.ps1"

# Create mock doc templates
"mock progress" | Set-Content "$script:ProtocolRepo\docs\_templates\progress.md"
"mock code-map" | Set-Content "$script:ProtocolRepo\docs\_templates\code-map.md"
"mock requirements" | Set-Content "$script:ProtocolRepo\docs\_templates\requirements.md"
'{"project":{}}' | Set-Content "$script:ProtocolRepo\docs\_templates\ai-manifest.json"
".gitkeep" | Set-Content "$script:ProtocolRepo\docs\_templates\proposals\.gitkeep"

# Create mock sync_config.yaml
@"
all_repos:
  - ai-protocol
"@ | Set-Content "$script:ProtocolRepo\sync_config.yaml"

# Use the real init_protocol.ps1
$script:ScriptPath = Join-Path (Split-Path $PSScriptRoot -Parent) "init_protocol.ps1"

Describe "Initialize-Protocol" {

    Context "Git Detection" {

        It "Should detect existing .git folder" {
            # Arrange
            $testDir = Join-Path $script:TempDir "git-test-$(Get-Random)"
            New-Item -ItemType Directory -Path $testDir -Force | Out-Null
            New-Item -ItemType Directory -Path "$testDir\.git" -Force | Out-Null

            # Act - Source the script and call function
            . $script:ScriptPath
            $result = Test-GitRepository -Path $testDir

            # Assert
            $result | Should Be $true
        }

        It "Should return false for non-git directory" {
            # Arrange
            $noGitDir = Join-Path $script:TempDir "no-git-$(Get-Random)"
            New-Item -ItemType Directory -Path $noGitDir -Force | Out-Null

            # Act
            . $script:ScriptPath
            $result = Test-GitRepository -Path $noGitDir

            # Assert
            $result | Should Be $false
        }

        It "Should initialize git when -AutoInit is specified and .git missing" {
            # Arrange
            $autoInitDir = Join-Path $script:TempDir "auto-init-$(Get-Random)"
            New-Item -ItemType Directory -Path $autoInitDir -Force | Out-Null

            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $autoInitDir -ProtocolRepo $script:ProtocolRepo -AutoInit

            # Assert
            Test-Path "$autoInitDir\.git" | Should Be $true
        }
    }

    Context "Protocol File Copying" {

        BeforeEach {
            # Create fresh target repo for each test
            $script:CurrentTarget = Join-Path $script:TempDir "target-$(Get-Random)"
            New-Item -ItemType Directory -Path $script:CurrentTarget -Force | Out-Null
            Push-Location $script:CurrentTarget
            git init 2>&1 | Out-Null
            Pop-Location
        }

        It "Should copy .github/copilot-instructions.md" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:CurrentTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            Test-Path "$script:CurrentTarget\.github\copilot-instructions.md" | Should Be $true
            Get-Content "$script:CurrentTarget\.github\copilot-instructions.md" | Should Be "mock copilot content"
        }

        It "Should copy .github/rules/ folder contents" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:CurrentTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            Test-Path "$script:CurrentTarget\.github\rules\SCENARIOS.md" | Should Be $true
            Test-Path "$script:CurrentTarget\.github\rules\GATES.md" | Should Be $true
        }

        It "Should copy .claude/commands/ folder contents" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:CurrentTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            Test-Path "$script:CurrentTarget\.claude\commands\commit.md" | Should Be $true
            Test-Path "$script:CurrentTarget\.claude\commands\plan.md" | Should Be $true
        }

        It "Should copy .claude/settings.local.json" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:CurrentTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            Test-Path "$script:CurrentTarget\.claude\settings.local.json" | Should Be $true
        }

        It "Should copy tools/sync_copilot_instructions.ps1" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:CurrentTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            Test-Path "$script:CurrentTarget\tools\sync_copilot_instructions.ps1" | Should Be $true
        }

        It "Should copy tools/extract_docs.ps1" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:CurrentTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            Test-Path "$script:CurrentTarget\tools\extract_docs.ps1" | Should Be $true
        }

        It "Should NOT overwrite existing files without -Force" {
            # Arrange - Create existing file with different content
            New-Item -ItemType Directory -Path "$script:CurrentTarget\.github" -Force | Out-Null
            "existing content" | Set-Content "$script:CurrentTarget\.github\copilot-instructions.md"

            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:CurrentTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            $content = Get-Content "$script:CurrentTarget\.github\copilot-instructions.md"
            $content | Should Be "existing content"
        }

        It "Should overwrite existing files WITH -Force" {
            # Arrange - Create existing file
            New-Item -ItemType Directory -Path "$script:CurrentTarget\.github" -Force | Out-Null
            "existing content" | Set-Content "$script:CurrentTarget\.github\copilot-instructions.md"

            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:CurrentTarget -ProtocolRepo $script:ProtocolRepo -Force

            # Assert
            $content = Get-Content "$script:CurrentTarget\.github\copilot-instructions.md"
            $content | Should Be "mock copilot content"
        }
    }

    Context "Docs Template Initialization" {

        BeforeEach {
            $script:DocsTarget = Join-Path $script:TempDir "docs-test-$(Get-Random)"
            New-Item -ItemType Directory -Path $script:DocsTarget -Force | Out-Null
            Push-Location $script:DocsTarget
            git init 2>&1 | Out-Null
            Pop-Location
        }

        It "Should create docs/ folder if not exists" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:DocsTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            Test-Path "$script:DocsTarget\docs" | Should Be $true
        }

        It "Should copy doc templates to docs/" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:DocsTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            Test-Path "$script:DocsTarget\docs\progress.md" | Should Be $true
            Test-Path "$script:DocsTarget\docs\code-map.md" | Should Be $true
            Test-Path "$script:DocsTarget\docs\requirements.md" | Should Be $true
        }

        It "Should create proposals subfolder" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:DocsTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            Test-Path "$script:DocsTarget\docs\proposals" | Should Be $true
        }

        It "Should NOT overwrite existing docs" {
            # Arrange
            New-Item -ItemType Directory -Path "$script:DocsTarget\docs" -Force | Out-Null
            "my project progress" | Set-Content "$script:DocsTarget\docs\progress.md"

            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:DocsTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            $content = Get-Content "$script:DocsTarget\docs\progress.md"
            $content | Should Be "my project progress"
        }

        It "Should create tmp/ folder with .gitkeep" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:DocsTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            Test-Path "$script:DocsTarget\tmp" | Should Be $true
            Test-Path "$script:DocsTarget\tmp\.gitkeep" | Should Be $true
        }
    }

    Context "Git Exclusions" {

        BeforeEach {
            $script:ExcludeTarget = Join-Path $script:TempDir "exclude-test-$(Get-Random)"
            New-Item -ItemType Directory -Path $script:ExcludeTarget -Force | Out-Null
            Push-Location $script:ExcludeTarget
            git init 2>&1 | Out-Null
            Pop-Location
        }

        It "Should create .git/info/exclude if not exists" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:ExcludeTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            Test-Path "$script:ExcludeTarget\.git\info\exclude" | Should Be $true
        }

        It "Should add .github/copilot-instructions pattern to exclusions" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:ExcludeTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            $exclude = Get-Content "$script:ExcludeTarget\.git\info\exclude" -Raw
            $exclude | Should Match "\.github/copilot-instructions"
        }

        It "Should add .github/rules/ pattern to exclusions" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:ExcludeTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            $exclude = Get-Content "$script:ExcludeTarget\.git\info\exclude" -Raw
            $exclude | Should Match "\.github/rules/"
        }

        It "Should add CLAUDE.md pattern to exclusions" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:ExcludeTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            $exclude = Get-Content "$script:ExcludeTarget\.git\info\exclude" -Raw
            $exclude | Should Match "CLAUDE\.md"
        }

        It "Should add docs/ pattern to exclusions" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:ExcludeTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            $exclude = Get-Content "$script:ExcludeTarget\.git\info\exclude" -Raw
            $exclude | Should Match "docs/"
        }

        It "Should add .claude/ pattern to exclusions" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:ExcludeTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            $exclude = Get-Content "$script:ExcludeTarget\.git\info\exclude" -Raw
            $exclude | Should Match "\.claude/"
        }

        It "Should not duplicate patterns on re-run" {
            # Act - Run twice
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:ExcludeTarget -ProtocolRepo $script:ProtocolRepo
            Initialize-Protocol -TargetRepo $script:ExcludeTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            $exclude = Get-Content "$script:ExcludeTarget\.git\info\exclude"
            $count = ($exclude | Where-Object { $_ -match "CLAUDE\.md" }).Count
            $count | Should Be 1
        }
    }

    Context "CLAUDE.md Generation" {

        BeforeEach {
            $script:ClaudeTarget = Join-Path $script:TempDir "claude-test-$(Get-Random)"
            New-Item -ItemType Directory -Path $script:ClaudeTarget -Force | Out-Null
            Push-Location $script:ClaudeTarget
            git init 2>&1 | Out-Null
            Pop-Location
        }

        It "Should generate CLAUDE.md from copilot-instructions.md" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:ClaudeTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            Test-Path "$script:ClaudeTarget\CLAUDE.md" | Should Be $true
        }

        It "Should include auto-generated header in CLAUDE.md" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:ClaudeTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            $content = Get-Content "$script:ClaudeTarget\CLAUDE.md" -Raw
            $content | Should Match "AUTO-GENERATED"
        }

        It "Should include content from copilot-instructions.md" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:ClaudeTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            $content = Get-Content "$script:ClaudeTarget\CLAUDE.md" -Raw
            $content | Should Match "mock copilot content"
        }
    }

    Context "Sync Config Update" {

        BeforeEach {
            $script:SyncTarget = Join-Path $script:TempDir "sync-test-$(Get-Random)"
            New-Item -ItemType Directory -Path $script:SyncTarget -Force | Out-Null
            Push-Location $script:SyncTarget
            git init 2>&1 | Out-Null
            Pop-Location

            # Reset sync_config.yaml for each test
            @"
all_repos:
  - ai-protocol
"@ | Set-Content "$script:ProtocolRepo\sync_config.yaml"
        }

        It "Should add new repo to sync_config.yaml" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:SyncTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            $config = Get-Content "$script:ProtocolRepo\sync_config.yaml" -Raw
            # Should contain the repo name (last part of path)
            $repoName = Split-Path $script:SyncTarget -Leaf
            $config | Should Match $repoName
        }

        It "Should NOT add duplicate entry on re-run" {
            # Act - Run twice
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:SyncTarget -ProtocolRepo $script:ProtocolRepo
            Initialize-Protocol -TargetRepo $script:SyncTarget -ProtocolRepo $script:ProtocolRepo

            # Assert
            $config = Get-Content "$script:ProtocolRepo\sync_config.yaml"
            $repoName = Split-Path $script:SyncTarget -Leaf
            $count = ($config | Where-Object { $_ -match $repoName }).Count
            $count | Should Be 1
        }

        It "Should skip config update with -SkipSync" {
            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $script:SyncTarget -ProtocolRepo $script:ProtocolRepo -SkipSync

            # Assert
            $config = Get-Content "$script:ProtocolRepo\sync_config.yaml" -Raw
            $repoName = Split-Path $script:SyncTarget -Leaf
            $config | Should Not Match $repoName
        }
    }

    Context "WhatIf Mode" {

        It "Should not make changes with -WhatIf" {
            # Arrange
            $whatIfTarget = Join-Path $script:TempDir "whatif-$(Get-Random)"
            New-Item -ItemType Directory -Path $whatIfTarget -Force | Out-Null
            Push-Location $whatIfTarget
            git init 2>&1 | Out-Null
            Pop-Location

            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo $whatIfTarget -ProtocolRepo $script:ProtocolRepo -WhatIf

            # Assert - No files should be created
            Test-Path "$whatIfTarget\.github" | Should Be $false
            Test-Path "$whatIfTarget\.claude" | Should Be $false
            Test-Path "$whatIfTarget\docs" | Should Be $false
        }
    }

    Context "Target Path Resolution" {

        It "Should resolve relative path to absolute" {
            # Arrange
            $relativeTarget = Join-Path $script:TempDir "relative-test"
            New-Item -ItemType Directory -Path $relativeTarget -Force | Out-Null
            Push-Location $relativeTarget
            git init 2>&1 | Out-Null
            Pop-Location

            # Act
            Push-Location $script:TempDir
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo "relative-test" -ProtocolRepo $script:ProtocolRepo
            Pop-Location

            # Assert
            Test-Path "$relativeTarget\.github\copilot-instructions.md" | Should Be $true
        }

        It "Should use current directory when TargetRepo is '.'" {
            # Arrange
            $currentDirTarget = Join-Path $script:TempDir "current-dir-test"
            New-Item -ItemType Directory -Path $currentDirTarget -Force | Out-Null
            Push-Location $currentDirTarget
            git init 2>&1 | Out-Null

            # Act
            . $script:ScriptPath
            Initialize-Protocol -TargetRepo "." -ProtocolRepo $script:ProtocolRepo
            Pop-Location

            # Assert
            Test-Path "$currentDirTarget\.github\copilot-instructions.md" | Should Be $true
        }
    }

    Context "Error Handling" {

        It "Should error if target path does not exist" {
            # Arrange
            $nonExistent = Join-Path $script:TempDir "does-not-exist-$(Get-Random)"
            . $script:ScriptPath

            # Act & Assert - use try/catch pattern for Pester 3.x compatibility
            $errorThrown = $false
            try {
                Initialize-Protocol -TargetRepo $nonExistent -ProtocolRepo $script:ProtocolRepo -ErrorAction Stop
            } catch {
                $errorThrown = $true
            }
            $errorThrown | Should Be $true
        }

        It "Should error if protocol repo does not exist" {
            # Arrange
            $validTarget = Join-Path $script:TempDir "valid-target-$(Get-Random)"
            New-Item -ItemType Directory -Path $validTarget -Force | Out-Null
            Push-Location $validTarget
            git init 2>&1 | Out-Null
            Pop-Location

            $badProtocol = Join-Path $script:TempDir "bad-protocol-$(Get-Random)"
            . $script:ScriptPath

            # Act & Assert - use try/catch pattern for Pester 3.x compatibility
            $errorThrown = $false
            try {
                Initialize-Protocol -TargetRepo $validTarget -ProtocolRepo $badProtocol -ErrorAction Stop
            } catch {
                $errorThrown = $true
            }
            $errorThrown | Should Be $true
        }
    }
}
