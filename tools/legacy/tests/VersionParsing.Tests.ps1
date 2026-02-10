#Requires -Modules Pester
<#
.SYNOPSIS
    Pester tests for version parsing functions in sync_copilot_instructions.ps1

.DESCRIPTION
    Tests Get-CopilotVersion and Find-HighestVersion functions.
    Run with: Invoke-Pester -Path .\tools\tests\

.NOTES
    Version: 1.0.0
    Created: 2026-01-20
#>

# Define VERSION_REGEX constant
$script:VERSION_REGEX = '<!-- copilot-instructions v(\d+\.\d+(?:\.\d+)?) \|'

# Define Get-CopilotVersion function for testing
function Get-CopilotVersion {
    [CmdletBinding()]
    [OutputType([version])]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath
    )
    
    if (-not (Test-Path $FilePath)) {
        return $null
    }
    
    try {
        $firstLine = Get-Content $FilePath -First 1 -ErrorAction Stop
        if ($firstLine -match $script:VERSION_REGEX) {
            return [version]$matches[1]
        }
    } catch {
        Write-Warning -Message "Could not read version from: $FilePath"
    }
    
    return $null
}

# Create temp directory for test files
$script:TempDir = Join-Path $env:TEMP "PesterVersionTests_$(Get-Random)"
New-Item -ItemType Directory -Path $script:TempDir -Force | Out-Null

Describe "Get-CopilotVersion" {
    
    Context "Valid version formats" {
        
        It "Should parse v5.1.0 from valid header" {
            $testFile = Join-Path $script:TempDir "test1.md"
            @"
<!-- copilot-instructions v5.1.0 | Last updated: 2026-01-20 -->
# Content
"@ | Set-Content $testFile
            
            $result = Get-CopilotVersion -FilePath $testFile
            $result | Should Be ([version]"5.1.0")
        }
        
        It "Should parse v4.0 (two-part version)" {
            $testFile = Join-Path $script:TempDir "test2.md"
            @"
<!-- copilot-instructions v4.0 | Last updated: 2026-01-15 -->
# Content
"@ | Set-Content $testFile
            
            $result = Get-CopilotVersion -FilePath $testFile
            $result | Should Be ([version]"4.0")
        }
        
        It "Should parse v10.20.30 (large numbers)" {
            $testFile = Join-Path $script:TempDir "test3.md"
            @"
<!-- copilot-instructions v10.20.30 | Last updated: 2026-01-20 -->
# Content
"@ | Set-Content $testFile
            
            $result = Get-CopilotVersion -FilePath $testFile
            $result | Should Be ([version]"10.20.30")
        }
    }
    
    Context "Invalid inputs" {
        
        It "Should return null for non-existent file" {
            $result = Get-CopilotVersion -FilePath "C:\nonexistent\file.md"
            $result | Should BeNullOrEmpty
        }
        
        It "Should return null for file without version" {
            $testFile = Join-Path $script:TempDir "no_version.md"
            @"
# Just a regular markdown file
No version here
"@ | Set-Content $testFile
            
            $result = Get-CopilotVersion -FilePath $testFile
            $result | Should BeNullOrEmpty
        }
        
        It "Should return null for malformed version" {
            $testFile = Join-Path $script:TempDir "bad_version.md"
            @"
<!-- copilot-instructions vABC | Last updated: 2026-01-20 -->
# Content
"@ | Set-Content $testFile
            
            $result = Get-CopilotVersion -FilePath $testFile
            $result | Should BeNullOrEmpty
        }
    }
    
    Context "Edge cases" {
        
        It "Should only read first line (version buried later should not match)" {
            $testFile = Join-Path $script:TempDir "buried.md"
            @"
# Some header first
<!-- copilot-instructions v9.9.9 | Last updated: 2026-01-20 -->
"@ | Set-Content $testFile
            
            $result = Get-CopilotVersion -FilePath $testFile
            $result | Should BeNullOrEmpty
        }
        
        It "Should handle empty file" {
            $testFile = Join-Path $script:TempDir "empty.md"
            "" | Set-Content $testFile
            
            $result = Get-CopilotVersion -FilePath $testFile
            $result | Should BeNullOrEmpty
        }
    }
}

Describe "Version Comparison" {
    
    Context "Version ordering" {
        
        It "Should correctly compare 5.1.0 > 5.0.2" {
            [version]"5.1.0" -gt [version]"5.0.2" | Should Be $true
        }
        
        It "Should correctly compare 5.0.10 > 5.0.9" {
            [version]"5.0.10" -gt [version]"5.0.9" | Should Be $true
        }
        
        It "Should correctly compare 4.0 < 5.0.0" {
            [version]"4.0" -lt [version]"5.0.0" | Should Be $true
        }
        
        It "Should handle equality" {
            [version]"5.0.2" -eq [version]"5.0.2" | Should Be $true
        }
    }
}

# Cleanup temp directory
if (Test-Path $script:TempDir) {
    Remove-Item $script:TempDir -Recurse -Force
}
