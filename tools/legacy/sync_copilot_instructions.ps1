<#
.SYNOPSIS
    Unified Personal Sync - Sync copilot-instructions, scripts, and docs across all projects.

.DESCRIPTION
    This script provides a unified approach to sync personal development files:
    - copilot-instructions.md (AI assistant configuration)
    - This sync script itself
    - Project documentation (phase-aware: solo vs integrated)
    
    All synced files are automatically excluded from git so team members never see them.
    
    Configuration is driven by sync_config.yaml for easy project management.
    
    Sync Strategy: "Newest Wins"
    - All protocol files use timestamp-based sync across ALL repos
    - Edit from any repo - the newest version automatically wins
    - No fixed "source" repo - whichever has the newest file becomes source
    
    Project Phases:
    - solo: Single repo development (backup to archive only)
    - integrated: Multi-repo sync (bidirectional + backup)

.EXAMPLE
    .\sync_copilot_instructions.ps1
    
.NOTES
    Author: AI File Search Project
    Version: 2.22.0
    Date: 2026-02-03

    Changelog:
    - 2.22.0: Fixed .NET CWD desync causing archive to be created in wrong repo (VS Code workspace issue)
    - 2.21.0: Added .claude/skills/ folder sync for Claude Code auto-triggered skills
    - 2.17.0: Added .claude/commands/ folder sync for Claude Code slash commands (12 commands)
    - 2.16.0: Fixed path normalization bug in Sync-DocsNewestWins causing truncated filenames (root cause of garbage file propagation)
    - 2.15.0: Removed 8 more dead functions (~260 lines) - Bootstrap-LocalRepo, Find-SourceFile, Find-HighestVersion, Update-SourceFromHighest, Sync-CopilotInstructions, Sync-GithubRules, Sync-ProtocolFiles, Sync-TestsFolder
    - 2.14.0: Removed dead code (legacy version-based sync functions replaced by datetime sync in v2.9.0)
    - 2.13.0: Added garbage filename filter to prevent malformed/truncated files from syncing
    - 2.12.0: Auto-generate CLAUDE.md for Claude Code extension (synced from copilot-instructions.md)
    - 2.11.0: Auto-install pre-commit hook that runs extract_docs.ps1 + sync before every commit
    - 2.20.0: Added init_protocol.ps1 to sync items (D-002 fix)
    - 2.19.0: Fixed project source_repo derivation from project name (D-003)
    - 2.18.0: Added -SkipTests parameter to bypass pre-sync tests (emergency use only)
    - 2.17.1: Fixed YAML parser section boundary detection (D-001)
    - 2.10.0: Added BackupOnly switch to Sync-DocsNewestWins (prevents deleted files from returning)
    - 2.9.0: All files now use "newest wins" strategy (edit from any repo safely)
    - 2.8.0: Sync protocol-changelog.md and protocol-evolution.md from .github/
    - 2.7.0: Added pre-sync Pester test hook (aborts sync if tests fail)
    - 2.6.0: File-level sync with newest-wins (fixes protocol-changelog.md overwrite bug)
    - 2.5.0: Added protocol-changelog.md reminder when copilot-instructions synced
    - 2.4.0: Added extract_docs.ps1 sync for auto-documentation generation
    - 2.3.0: Added .github/rules/ folder sync with auto-exclusion
    - 2.2.0: Use wildcard pattern for copilot-instructions exclusion to handle backup files
    - 2.1.0: Fixed ${base_path} variable expansion in config parser, updated all paths to coding_projects
    - 2.0.0: Config-driven unified sync with phase-aware project docs
    - 1.4.0: Added pillar_snapper docs bidirectional sync with versioning
    - 1.3.1: Added GetSpace_branch to target repositories
    - 1.3.0: Added bootstrap mode for new repos without copilot-instructions.md
    - 1.2.0: Added bidirectional sync and version discovery
#>

[CmdletBinding()]
param(
    [switch]$SkipTests
)

# Script version (update this when making changes)
$SCRIPT_VERSION = [version]"2.22.0"
$SCRIPT_NAME = "sync_copilot_instructions.ps1"
$EXTRACT_DOCS_SCRIPT_NAME = "extract_docs.ps1"
$PRE_COMMIT_HOOK_NAME = "pre-commit"
$CLAUDE_MD_FILE_NAME = "CLAUDE.md"
$CLAUDE_COMMANDS_DIR = ".claude/commands"

# Garbage filename filter - skip malformed/truncated filenames during sync
# These are corrupted files that should never be synced
$GARBAGE_FILENAME_PATTERN = '^(\.md|ap\.md|d|ects\.md|ements\.md|evolution\.md|g\.md|ion\.md|log\.md|md|ngelog\.md|oring\.md|s\.md|tocol-changelog\.md|tocol-evolution\.md|actoring\.md|e-map\.md|lution\.md|ng\.md|nts\.md|ol-changelog\.md|ol-evolution\.md|ting\.md|uirements\.md)$'

# File and folder constants
$COPILOT_FILE_NAME = "copilot-instructions.md"
$GITHUB_DIR = ".github"
$GITHUB_RULES_DIR = ".github/rules"
$TOOLS_DIR = "tools"
$TOOLS_TESTS_DIR = "tools/tests"
$GIT_EXCLUDE_PATH = ".git\info\exclude"

# ═══════════════════════════════════════════════════════════════════════════
# DEPRECATED - DO NOT MODIFY
# Protocol files have been MOVED from .github/ to .github/rules/:
#   OLD: .github/protocol-changelog.md  → NEW: .github/rules/PROTOCOL_CHANGELOG.md
#   OLD: .github/protocol-evolution.md  → NEW: .github/rules/PROTOCOL_EVOLUTION.md
# The old files should be DELETED. They are now synced via the rules folder.
# This array MUST remain empty to prevent sync conflicts.
# ═══════════════════════════════════════════════════════════════════════════
$PROTOCOL_FILES = @()

# Pattern constants for exclusion
$COPILOT_EXCLUDE_PATTERN = "$GITHUB_DIR/copilot-instructions*.md"
$GITHUB_RULES_EXCLUDE_PATTERN = "$GITHUB_DIR/rules/"
$PROTOCOL_FILES_EXCLUDE_PATTERN = "$GITHUB_DIR/protocol-*.md"
$SCRIPT_EXCLUDE_PATTERN = "$TOOLS_DIR/$SCRIPT_NAME"
$EXTRACT_DOCS_EXCLUDE_PATTERN = "$TOOLS_DIR/$EXTRACT_DOCS_SCRIPT_NAME"
$TOOLS_TESTS_EXCLUDE_PATTERN = "$TOOLS_TESTS_DIR/"
$DOCS_EXCLUDE_PATTERN = "docs/"
$TMP_EXCLUDE_PATTERN = "tmp/"
$CLAUDE_MD_EXCLUDE_PATTERN = "CLAUDE.md"
$CLAUDE_COMMANDS_EXCLUDE_PATTERN = ".claude/"

# Regex patterns
$VERSION_REGEX = 'copilot-instructions v([\d.]+)'

# Config file path - Located in ai-protocol repository
$SYNC_CONFIG_PATH = "C:\Users\ziyil\coding_projects\ai-protocol\sync_config.yaml"
$DOC_VERSION_FILE = ".doc-version.yaml"

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION LOADING
# ═══════════════════════════════════════════════════════════════════════════

# Global config variable (loaded once)
$script:SyncConfig = $null

function Load-SyncConfig {
    [CmdletBinding()]
    [OutputType([hashtable])]
    param()
    
    if ($script:SyncConfig) {
        return $script:SyncConfig
    }
    
    if (-not (Test-Path $SYNC_CONFIG_PATH)) {
        Write-Warning "Config file not found: $SYNC_CONFIG_PATH"
        Write-Warning "Using legacy hardcoded configuration"
        return $null
    }
    
    try {
        # Simple YAML parser for our specific format
        $content = Get-Content $SYNC_CONFIG_PATH -Raw
        $config = @{
            global = @{}
            projects = @{}
            all_repos = @()
        }
        
        $currentSection = $null
        $currentProject = $null
        $currentTarget = $null
        $inTargets = $false
        
        foreach ($line in ($content -split "`n")) {
            $line = $line.TrimEnd()
            
            # Skip comments and empty lines
            if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
            
            # Top-level sections (FIX D-001: Added sync_items and exclusions detection)
            if ($line -match '^global:') { $currentSection = 'global'; continue }
            if ($line -match '^projects:') { $currentSection = 'projects'; continue }
            if ($line -match '^all_repos:') { $currentSection = 'all_repos'; continue }
            if ($line -match '^sync_items:') { $currentSection = 'sync_items'; continue }
            if ($line -match '^exclusions:') { $currentSection = 'exclusions'; continue }
            
            # all_repos list items (only quoted strings are valid repo names)
            if ($currentSection -eq 'all_repos' -and $line -match '^\s+-\s+"([^"]+)"') {
                $config.all_repos += $matches[1]
                continue
            }
            
            # Global settings
            if ($currentSection -eq 'global' -and $line -match '^\s+(\w+):\s*"?([^"]+)"?') {
                $config.global[$matches[1]] = $matches[2].Trim('"')
                continue
            }
            
            # Project name (indented once under projects:)
            if ($currentSection -eq 'projects' -and $line -match '^  (\w+):$') {
                $currentProject = $matches[1]
                $config.projects[$currentProject] = @{
                    phase = 'solo'
                    source_repo = ''
                    docs_path = 'docs'
                    sync_targets = @()
                }
                $inTargets = $false
                continue
            }
            
            # Project properties
            if ($currentProject -and $line -match '^\s{4}(\w+):\s*"?([^"]*)"?') {
                $key = $matches[1]
                $value = $matches[2].Trim('"')
                if ($key -eq 'sync_targets') {
                    $inTargets = $true
                    continue
                }
                $config.projects[$currentProject][$key] = $value
                continue
            }
            
            # Sync target list item start
            if ($inTargets -and $line -match '^\s{6}-\s+repo:\s*"?([^"]+)"?') {
                $currentTarget = @{ repo = $matches[1].Trim('"'); docs_path = '' }
                continue
            }
            
            # Sync target docs_path
            if ($currentTarget -and $line -match '^\s{8}docs_path:\s*"?([^"]+)"?') {
                $currentTarget.docs_path = $matches[1].Trim('"')
                $config.projects[$currentProject].sync_targets += $currentTarget
                $currentTarget = $null
                continue
            }
        }
        

        # Expand ${base_path} variables AND convert repo names to full paths
        $basePath = $config.global['base_path']
        if ($basePath) {
            # Expand in all_repos - handle both ${base_path}/repo and plain repo names
            $config.all_repos = $config.all_repos | ForEach-Object { 
                $repo = $_ -replace '\$\{base_path\}', $basePath
                # If repo is just a name (not a full path), prepend base_path
                if (-not [System.IO.Path]::IsPathRooted($repo)) {
                    $repo = Join-Path $basePath $repo
                }
                $repo
            }
            
            # Expand in global settings
            foreach ($key in @($config.global.Keys)) {
                $config.global[$key] = $config.global[$key] -replace '\$\{base_path\}', $basePath
            }
            
            # Expand in projects
            foreach ($projectName in @($config.projects.Keys)) {
                $project = $config.projects[$projectName]
                # First expand any ${base_path} variables in source_repo
                $project.source_repo = $project.source_repo -replace '\$\{base_path\}', $basePath
                
                # D-003 FIX: If source_repo is still empty, derive from base_path + project_name
                if ([string]::IsNullOrEmpty($project.source_repo)) {
                    $project.source_repo = Join-Path $basePath $projectName
                }
                
                # Expand in sync_targets
                for ($i = 0; $i -lt $project.sync_targets.Count; $i++) {
                    $project.sync_targets[$i].repo = $project.sync_targets[$i].repo -replace '\$\{base_path\}', $basePath
                }
            }
        }
        $script:SyncConfig = $config
        return $config
    } catch {
        Write-Warning "Failed to parse config: $_"
        return $null
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# LEGACY CONFIGURATION (fallback if no config file)
# ═══════════════════════════════════════════════════════════════════════════
# Add repository paths here. Script will:
# 1. Create .github folder if missing
# 2. Sync copilot-instructions.md if target version is older (or missing)
# 3. Auto-untrack if file is tracked in git
# 4. Add to .git/info/exclude
# 5. Verify file is ignored
#
# To add a new repository:
# - Add absolute path to the array below
# - Ensure path exists and is a git repository
# ═══════════════════════════════════════════════════════════════════════════

# Legacy hardcoded values (used if config file not found)
$PILLAR_SNAPPER_SOURCE = "C:\Users\ziyil\coding_projects\pillar_snapper"
$PILLAR_SNAPPER_DOCS_DIR = "docs"
$PILLAR_SNAPPER_VERSION_FILE = ".doc-version.yaml"
$PILLAR_SNAPPER_DOCS_EXCLUDE = "packages/pillar_snapper/docs/"

$PILLAR_SNAPPER_TARGETS = @(
    @{
        Repo = "C:\Users\ziyil\coding_projects\GetSpace_branch"
        PackagePath = "packages\pillar_snapper"
    },
    @{
        Repo = "C:\Users\ziyil\coding_projects\GetSpace"
        PackagePath = "packages\pillar_snapper"
    }
)

$TARGET_REPOS = @(
    "C:\Users\ziyil\coding_projects\pillar_snapper",
    "C:\Users\ziyil\coding_projects\ai-file-search",
    "C:\Users\ziyil\coding_projects\GetSpace",
    "C:\Users\ziyil\coding_projects\GetSpace_branch"
)

# Validate repository paths
$TARGET_REPOS = $TARGET_REPOS | Where-Object { 
    if (Test-Path $_) { 
        $true 
    } else { 
        Write-Warning "Repository path does not exist, will be skipped: $_"
        $false 
    }
}

# Output formatting functions
function Write-Success { 
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Message) 
    Write-Host "✓ $Message" -ForegroundColor Green 
}

function Write-Info { 
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Message) 
    Write-Host "→ $Message" -ForegroundColor Cyan 
}

function Write-Warning { 
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Message) 
    Write-Host "⚠ $Message" -ForegroundColor Yellow 
}

function Write-Error { 
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Message) 
    Write-Host "✗ $Message" -ForegroundColor Red 
}

function Write-SectionDivider {
    [CmdletBinding()]
    param([Parameter(Mandatory)][string]$Title)
    Write-Host ""
    Write-Host ("═" * 55) -ForegroundColor Cyan
    Write-Host $Title -ForegroundColor Cyan
    Write-Host ("═" * 55) -ForegroundColor Cyan
}

# Parse version from copilot-instructions.md first line
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
        if ($firstLine -match $VERSION_REGEX) {
            return [version]$matches[1]
        }
    } catch {
        Write-Warning -Message "Could not read version from: $FilePath"
    }
    
    return $null
}

# Check if two paths are the same
function Test-SamePath {
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)]
        [string]$Path1,
        
        [Parameter(Mandatory)]
        [string]$Path2
    )
    
    try {
        $resolved1 = [System.IO.Path]::GetFullPath($Path1).TrimEnd('\', '/')
        $resolved2 = [System.IO.Path]::GetFullPath($Path2).TrimEnd('\', '/')
        return $resolved1 -eq $resolved2
    } catch {
        Write-Verbose "Path comparison failed: $_"
        return $false
    }
}

# Find the git repository root from current directory
function Find-CurrentRepoRoot {
    [CmdletBinding()]
    [OutputType([string])]
    param()
    
    $currentDir = Get-Location
    $checkDir = $currentDir.Path
    
    while ($checkDir) {
        if (Test-Path (Join-Path $checkDir ".git")) {
            return $checkDir
        }
        $parent = Split-Path $checkDir -Parent
        if ($parent -eq $checkDir) {
            # Reached root
            break
        }
        $checkDir = $parent
    }
    
    # Not in a git repo, return current directory
    return $currentDir.Path
}

# Add exclusion to .git/info/exclude
function Add-GitExclusion {
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)]
        [string]$RepoPath,
        
        [Parameter()]
        [string]$Pattern = "$GITHUB_DIR/$COPILOT_FILE_NAME"
    )
    
    $excludeFile = Join-Path $RepoPath $GIT_EXCLUDE_PATH
    
    # Check if .git exists
    if (-not (Test-Path (Join-Path $RepoPath ".git"))) {
        Write-Warning -Message "Not a git repository: $RepoPath"
        return $false
    }
    
    # Create exclude file if doesn't exist
    if (-not (Test-Path $excludeFile)) {
        New-Item -ItemType File -Path $excludeFile -Force | Out-Null
    }
    
    # Check if pattern already exists
    $content = Get-Content $excludeFile -ErrorAction SilentlyContinue
    if ($content -contains $Pattern) {
        Write-Info -Message "Exclusion already exists in: $RepoPath"
        return $true
    }
    
    # Add pattern
    Add-Content -Path $excludeFile -Value $Pattern
    Write-Success -Message "Added exclusion to: $RepoPath"
    return $true
}

# Verify file is ignored by git
function Test-GitIgnored {
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)]
        [string]$RepoPath,
        
        [Parameter()]
        [string]$File = "$GITHUB_DIR\$COPILOT_FILE_NAME"
    )
    
    Push-Location $RepoPath
    try {
        $status = git status --porcelain $File 2>$null
        if ([string]::IsNullOrWhiteSpace($status)) {
            Write-Success -Message "Verified ignored in: $RepoPath"
            return $true
        } else {
            Write-Warning -Message "File still tracked in: $RepoPath (Status: $status)"
            return $false
        }
    } catch {
        Write-Verbose "Git status check failed: $_"
        return $false
    } finally {
        Pop-Location
    }
}

# Check if file is tracked in git index
function Test-GitTracked {
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)]
        [string]$RepoPath,
        
        [Parameter()]
        [string]$File = "$GITHUB_DIR/$COPILOT_FILE_NAME"
    )
    
    Push-Location $RepoPath
    try {
        # git ls-files returns non-empty if file is tracked
        $tracked = git ls-files $File 2>$null
        return -not [string]::IsNullOrWhiteSpace($tracked)
    } catch {
        Write-Verbose "Git ls-files check failed: $_"
        return $false
    } finally {
        Pop-Location
    }
}

# Remove file from git index (stop tracking)
function Remove-FromGitIndex {
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)]
        [string]$RepoPath,
        
        [Parameter()]
        [string]$File = "$GITHUB_DIR/$COPILOT_FILE_NAME"
    )
    
    Push-Location $RepoPath
    try {
        # Remove from index but keep working copy
        $result = git rm --cached $File 2>&1
        if ($LASTEXITCODE -eq 0) {
            # Commit the removal
            git commit -m "chore: stop tracking $COPILOT_FILE_NAME" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success -Message "Removed from git tracking: $File"
                return $true
            } else {
                Write-Warning -Message "Failed to commit removal of $File"
                return $false
            }
        } else {
            Write-Warning -Message "Failed to remove from index: $result"
            return $false
        }
    } catch {
        Write-Warning -Message "Error removing from git index: $_"
        return $false
    } finally {
        Pop-Location
    }
}

# Sync result object for better structure
function New-SyncResult {
    [CmdletBinding()]
    param(
        [int]$Synced = 0,
        [int]$Skipped = 0,
        [int]$Excluded = 0,
        [int]$Untracked = 0,
        [int]$Verified = 0,
        [int]$ScriptsSynced = 0,
        [int]$RulesSynced = 0,
        [int]$TestsSynced = 0,
        [int]$DocsBackedUp = 0,
        [int]$DocsSynced = 0,
        [int]$HooksInstalled = 0,
        [int]$ClaudeMdGenerated = 0,
        [int]$CommandsSynced = 0
    )
    
    return [PSCustomObject]@{
        Synced = $Synced
        Skipped = $Skipped
        Excluded = $Excluded
        Untracked = $Untracked
        Verified = $Verified
        ScriptsSynced = $ScriptsSynced
        RulesSynced = $RulesSynced
        TestsSynced = $TestsSynced
        DocsBackedUp = $DocsBackedUp
        DocsSynced = $DocsSynced
        HooksInstalled = 0
        ClaudeMdGenerated = 0
        CommandsSynced = 0
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# CONFIG-DRIVEN PROJECT DOCS SYNC FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

# Parse version from .doc-version.yaml
function Get-DocVersion {
    [CmdletBinding()]
    [OutputType([version])]
    param(
        [Parameter(Mandatory)]
        [string]$DocsPath
    )
    
    $versionFile = Join-Path $DocsPath $DOC_VERSION_FILE
    
    if (-not (Test-Path $versionFile)) {
        return $null
    }
    
    try {
        $content = Get-Content $versionFile -Raw -ErrorAction Stop
        if ($content -match 'version:\s*"?([\d.]+)"?') {
            return [version]$matches[1]
        }
    } catch {
        Write-Warning -Message "Could not read doc version from: $versionFile"
    }
    
    return $null
}

# Update .doc-version.yaml with new version and metadata
# NOTE: This is informational only - sync uses file timestamps, not this version
function Update-DocVersion {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$DocsPath,
        
        [Parameter(Mandatory)]
        [version]$NewVersion,
        
        [Parameter(Mandatory)]
        [string]$RepoName,
        
        [Parameter()]
        [string]$BranchName = "unknown",
        
        [Parameter()]
        [string]$Action = "Synced"  # Unused, kept for backwards compatibility
    )
    
    $versionFile = Join-Path $DocsPath $DOC_VERSION_FILE
    $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
    
    $content = @"
# ═══════════════════════════════════════════════════════════════
# DOCS SYNC METADATA (Informational Only)
# ═══════════════════════════════════════════════════════════════
#
# This file is auto-updated by: tools/sync_copilot_instructions.ps1
# Function: Update-DocVersion (called by Sync-DocsNewestWins)
#
# NOTE: This version number is NOT used for sync decisions.
#       File sync uses LastWriteTime timestamps (newest wins).
#       This file exists only for human reference and audit trail.
#
# ═══════════════════════════════════════════════════════════════

version: "$NewVersion"
last_sync: "$timestamp"
synced_from: "$RepoName"
branch: "$BranchName"
"@
    
    Set-Content -Path $versionFile -Value $content -Force
}

# Increment doc version (patch bump)
function Get-IncrementedVersion {
    [CmdletBinding()]
    [OutputType([version])]
    param(
        [Parameter(Mandatory)]
        [AllowNull()]
        [version]$CurrentVersion
    )
    
    if ($null -eq $CurrentVersion) {
        return [version]"1.0"
    }
    
    # Patch bump: 1.0 -> 1.1, 1.5 -> 1.6
    $major = $CurrentVersion.Major
    $minor = $CurrentVersion.Minor + 1
    
    return [version]"$major.$minor"
}

# Find highest doc version across source and all targets
function Find-HighestDocVersion {
    [CmdletBinding()]
    [OutputType([PSCustomObject])]
    param()
    
    Write-Info -Message "Scanning for highest pillar_snapper docs version..."
    
    $highestVersion = [version]"0.0"
    $highestPath = $null
    $highestRepo = $null
    
    # Check source
    $sourceDocsPath = Join-Path $PILLAR_SNAPPER_SOURCE $PILLAR_SNAPPER_DOCS_DIR
    if (Test-Path $sourceDocsPath) {
        $sourceVersion = Get-DocVersion -DocsPath $sourceDocsPath
        if ($sourceVersion) {
            Write-Info -Message "  Source (pillar_snapper): v$sourceVersion"
            $highestVersion = $sourceVersion
            $highestPath = $sourceDocsPath
            $highestRepo = "pillar_snapper"
        } else {
            Write-Info -Message "  Source (pillar_snapper): No version file"
        }
    } else {
        Write-Info -Message "  Source (pillar_snapper): docs/ not found"
    }
    
    # Check each target
    foreach ($target in $PILLAR_SNAPPER_TARGETS) {
        $targetDocsPath = Join-Path $target.Repo (Join-Path $target.PackagePath $PILLAR_SNAPPER_DOCS_DIR)
        if (Test-Path $targetDocsPath) {
            $targetVersion = Get-DocVersion -DocsPath $targetDocsPath
            $repoName = Split-Path $target.Repo -Leaf
            if ($targetVersion) {
                Write-Info -Message "  Target ($repoName): v$targetVersion"
                if ($targetVersion -gt $highestVersion) {
                    $highestVersion = $targetVersion
                    $highestPath = $targetDocsPath
                    $highestRepo = $repoName
                }
            } else {
                Write-Info -Message "  Target ($repoName): No version file"
            }
        }
    }
    
    return [PSCustomObject]@{
        Version = $highestVersion
        Path = $highestPath
        Repo = $highestRepo
        IsSource = ($highestRepo -eq "pillar_snapper")
    }
}

# Copy docs folder from source to destination
function Copy-DocsFolder {
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)]
        [string]$SourcePath,
        
        [Parameter(Mandatory)]
        [string]$DestPath
    )
    
    try {
        # Create destination if not exists
        if (-not (Test-Path $DestPath)) {
            New-Item -ItemType Directory -Path $DestPath -Force | Out-Null
        }
        
        # Copy all files (overwrite)
        Copy-Item -Path "$SourcePath\*" -Destination $DestPath -Recurse -Force
        return $true
    } catch {
        Write-Error -Message "Failed to copy docs: $_"
        return $false
    }
}

# Main sync function for pillar_snapper docs
function Sync-PillarSnapperDocs {
    [CmdletBinding()]
    [OutputType([PSCustomObject])]
    param()
    
    Write-SectionDivider -Title "PILLAR SNAPPER DOCS SYNC"
    
    $result = [PSCustomObject]@{
        Success = $false
        Direction = "none"
        Version = $null
        Message = ""
    }
    
    # Check if source repo exists
    if (-not (Test-Path $PILLAR_SNAPPER_SOURCE)) {
        Write-Warning -Message "Pillar Snapper source not found: $PILLAR_SNAPPER_SOURCE"
        $result.Message = "Source repo not found"
        return $result
    }
    
    # Find highest version
    $highest = Find-HighestDocVersion
    
    if ($null -eq $highest.Path) {
        Write-Warning -Message "No docs folder found in any location"
        Write-Info -Message "Creating initial docs in source..."
        
        # Create docs folder in source
        $sourceDocsPath = Join-Path $PILLAR_SNAPPER_SOURCE $PILLAR_SNAPPER_DOCS_DIR
        New-Item -ItemType Directory -Path $sourceDocsPath -Force | Out-Null
        Update-DocVersion -DocsPath $sourceDocsPath -NewVersion ([version]"1.0") -RepoName "pillar_snapper" -Action "Initial docs setup"
        
        $highest = [PSCustomObject]@{
            Version = [version]"1.0"
            Path = $sourceDocsPath
            Repo = "pillar_snapper"
            IsSource = $true
        }
    }
    
    Write-Host ""
    Write-Success -Message "Highest version: v$($highest.Version) at $($highest.Repo)"
    
    # Increment version for sync
    $newVersion = Get-IncrementedVersion -CurrentVersion $highest.Version
    
    # Get current branch name from highest repo
    $branchName = "unknown"
    $highestRepoRoot = if ($highest.IsSource) { $PILLAR_SNAPPER_SOURCE } else {
        ($PILLAR_SNAPPER_TARGETS | Where-Object { (Split-Path $_.Repo -Leaf) -eq $highest.Repo }).Repo
    }
    if ($highestRepoRoot -and (Test-Path (Join-Path $highestRepoRoot ".git"))) {
        Push-Location $highestRepoRoot
        try {
            $branchName = git rev-parse --abbrev-ref HEAD 2>$null
            if ([string]::IsNullOrWhiteSpace($branchName)) { $branchName = "unknown" }
        } finally {
            Pop-Location
        }
    }
    
    # Sync to all locations
    $sourceDocsPath = Join-Path $PILLAR_SNAPPER_SOURCE $PILLAR_SNAPPER_DOCS_DIR
    $syncCount = 0
    
    # Sync to source if needed
    if (-not $highest.IsSource) {
        Write-Host ""
        Write-Info -Message "Syncing BACK to pillar_snapper (target has newer version)"
        if (Copy-DocsFolder -SourcePath $highest.Path -DestPath $sourceDocsPath) {
            Update-DocVersion -DocsPath $sourceDocsPath -NewVersion $newVersion -RepoName "pillar_snapper" -BranchName $branchName -Action "Synced from $($highest.Repo)"
            Write-Success -Message "Source updated to v$newVersion"
            $syncCount++
        }
        $result.Direction = "target-to-source"
    } else {
        $result.Direction = "source-to-targets"
    }
    
    # Sync to all targets
    foreach ($target in $PILLAR_SNAPPER_TARGETS) {
        if (-not (Test-Path $target.Repo)) {
            Write-Warning -Message "Target repo not found: $($target.Repo)"
            continue
        }
        
        $targetDocsPath = Join-Path $target.Repo (Join-Path $target.PackagePath $PILLAR_SNAPPER_DOCS_DIR)
        $repoName = Split-Path $target.Repo -Leaf
        
        # Skip if this is where the highest version came from
        if ($targetDocsPath -eq $highest.Path) {
            Write-Info -Message "Skipping $repoName (already has highest version)"
            continue
        }
        
        Write-Host ""
        Write-Info -Message "Syncing to $repoName..."
        
        # Ensure package directory exists
        $targetPackagePath = Join-Path $target.Repo $target.PackagePath
        if (-not (Test-Path $targetPackagePath)) {
            Write-Warning -Message "Package path not found: $targetPackagePath"
            continue
        }
        
        # Copy from highest to target
        if (Copy-DocsFolder -SourcePath $highest.Path -DestPath $targetDocsPath) {
            Update-DocVersion -DocsPath $targetDocsPath -NewVersion $newVersion -RepoName $repoName -BranchName $branchName -Action "Synced from $($highest.Repo)"
            Write-Success -Message "$repoName updated to v$newVersion"
            $syncCount++
            
            # Add git exclusion for docs
            Add-GitExclusion -RepoPath $target.Repo -Pattern $PILLAR_SNAPPER_DOCS_EXCLUDE | Out-Null
        }
    }
    
    $result.Success = $syncCount -gt 0
    $result.Version = $newVersion
    $result.Message = "Synced to $syncCount location(s)"
    
    Write-Host ""
    Write-Success -Message "Pillar Snapper docs sync complete (v$newVersion)"
    
    return $result
}

# ═══════════════════════════════════════════════════════════════════════════

# HIGH PRIORITY REFACTORING: Extracted sync functions

# Ensure git protection for a file (untrack + exclude + verify)
function Ensure-GitProtection {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$RepoPath,
        
        [Parameter(Mandatory)]
        [string]$FilePattern,
        
        [Parameter(Mandatory)]
        [string]$FilePath,
        
        [Parameter(Mandatory)]
        [ref]$Results
    )
    
    # Check if file is tracked in git and remove if needed
    if (Test-GitTracked -RepoPath $RepoPath -File $FilePattern) {
        Write-Info -Message "File is tracked in git, removing from index..."
        if (Remove-FromGitIndex -RepoPath $RepoPath -File $FilePattern) {
            $Results.Value.Untracked++
        }
    }
    
    # Add exclusion
    if (Add-GitExclusion -RepoPath $RepoPath -Pattern $FilePattern) {
        $Results.Value.Excluded++
    }
    
    # Verify ignored
    if (Test-GitIgnored -RepoPath $RepoPath -File $FilePath) {
        $Results.Value.Verified++
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# NEWEST-WINS SYNC (UNIVERSAL)
# ═══════════════════════════════════════════════════════════════════════════

function Sync-FileNewestWinsAllRepos {
    <#
    .SYNOPSIS
        Sync a single file across all repos using newest-wins strategy.
    
    .DESCRIPTION
        Finds the newest version of a file across ALL repos (by timestamp),
        then copies that version to all other repos. This allows editing
        from any repo - the most recent edit always wins.
    
    .PARAMETER RelativePath
        Path to the file relative to repo root (e.g., ".github/copilot-instructions.md")
    
    .PARAMETER AllRepos
        Array of all repository root paths to sync across.
    
    .PARAMETER Description
        Human-readable name for logging (e.g., "copilot-instructions.md")
    
    .OUTPUTS
        Hashtable with WinnerRepo, WinnerTime, SyncedCount, SkippedCount
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$RelativePath,
        
        [Parameter(Mandatory)]
        [string[]]$AllRepos,
        
        [Parameter(Mandatory)]
        [string]$Description
    )
    
    $result = @{
        WinnerRepo = $null
        WinnerTime = $null
        SyncedCount = 0
        SkippedCount = 0
        NotFoundCount = 0
    }
    
    # Step 1: Find the newest file across all repos
    $newestFile = $null
    $newestTime = [DateTime]::MinValue
    $newestRepo = $null
    $existingRepos = @()
    
    foreach ($repo in $AllRepos) {
        $filePath = Join-Path $repo $RelativePath
        if (Test-Path $filePath) {
            $existingRepos += $repo
            $fileInfo = Get-Item $filePath
            if ($fileInfo.LastWriteTime -gt $newestTime) {
                $newestTime = $fileInfo.LastWriteTime
                $newestFile = $filePath
                $newestRepo = $repo
            }
        } else {
            $result.NotFoundCount++
        }
    }
    
    if (-not $newestFile) {
        Write-Warning "  $Description not found in any repo"
        return $result
    }
    
    $result.WinnerRepo = Split-Path $newestRepo -Leaf
    $result.WinnerTime = $newestTime
    
    Write-Info "  $Description winner: $($result.WinnerRepo) ($($newestTime.ToString('yyyy-MM-dd HH:mm:ss')))"
    
    # Step 2: Copy to all other repos
    $newestHash = (Get-FileHash $newestFile -Algorithm MD5).Hash
    
    foreach ($repo in $AllRepos) {
        if ($repo -eq $newestRepo) {
            continue  # Skip the winner repo
        }
        
        $targetPath = Join-Path $repo $RelativePath
        $targetDir = Split-Path $targetPath -Parent
        $repoName = Split-Path $repo -Leaf
        
        # Create directory if needed
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        
        # Check if update needed
        $needsUpdate = $true
        if (Test-Path $targetPath) {
            $targetHash = (Get-FileHash $targetPath -Algorithm MD5).Hash
            if ($targetHash -eq $newestHash) {
                $needsUpdate = $false
            }
        }
        
        if ($needsUpdate) {
            try {
                Copy-Item -Path $newestFile -Destination $targetPath -Force
                Write-Success "  → Synced to $repoName"
                $result.SyncedCount++
            } catch {
                Write-Error "  Failed to sync to ${repoName}: $_"
            }
        } else {
            Write-Info "  $repoName is up-to-date"
            $result.SkippedCount++
        }
    }
    
    return $result
}

function Sync-FolderNewestWinsAllRepos {
    <#
    .SYNOPSIS
        Sync a folder's files across all repos using newest-wins strategy.
    
    .DESCRIPTION
        For each file in the folder, finds the newest version across ALL repos,
        then copies that version to all other repos.
    
    .PARAMETER RelativeFolderPath
        Path to the folder relative to repo root (e.g., ".github/rules")
    
    .PARAMETER AllRepos
        Array of all repository root paths to sync across.
    
    .PARAMETER FilePattern
        File pattern to match (e.g., "*.md", "*.ps1"). Default is "*".
    
    .PARAMETER Description
        Human-readable name for logging (e.g., "rules/")
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$RelativeFolderPath,
        
        [Parameter(Mandatory)]
        [string[]]$AllRepos,
        
        [string]$FilePattern = "*",
        
        [Parameter(Mandatory)]
        [string]$Description
    )
    
    $result = @{
        TotalFiles = 0
        SyncedCount = 0
        SkippedCount = 0
    }
    
    # Gather all unique file names from all repos
    $allFileNames = @{}
    
    foreach ($repo in $AllRepos) {
        $folderPath = Join-Path $repo $RelativeFolderPath
        if (Test-Path $folderPath) {
            Get-ChildItem -Path $folderPath -File -Filter $FilePattern | ForEach-Object {
                $allFileNames[$_.Name] = $true
            }
        }
    }
    
    $result.TotalFiles = $allFileNames.Count
    
    if ($result.TotalFiles -eq 0) {
        Write-Info "  No files found in $Description"
        return $result
    }
    
    # For each file, find newest and sync
    foreach ($fileName in $allFileNames.Keys) {
        $relativePath = Join-Path $RelativeFolderPath $fileName
        $fileResult = Sync-FileNewestWinsAllRepos -RelativePath $relativePath -AllRepos $AllRepos -Description $fileName
        $result.SyncedCount += $fileResult.SyncedCount
        $result.SkippedCount += $fileResult.SkippedCount
    }
    
    return $result
}

# ═══════════════════════════════════════════════════════════════════════════
# PRE-COMMIT HOOK INSTALLATION
# ═══════════════════════════════════════════════════════════════════════════

function Install-PreCommitHook {
    <#
    .SYNOPSIS
        Installs a pre-commit hook that runs extract_docs.ps1 and sync before every commit.
    
    .DESCRIPTION
        Creates .git/hooks/pre-commit with inline PowerShell script that:
        1. Runs extract_docs.ps1 to update docs from code comments
        2. Runs sync_copilot_instructions.ps1 to sync docs across repos
        
        The hook is installed in all synced repos automatically.
        Docs remain private (not committed) via .git/info/exclude.
    
    .PARAMETER RepoPath
        The repository path where the hook should be installed.
    
    .OUTPUTS
        Boolean indicating if hook was installed or updated.
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)]
        [string]$RepoPath
    )
    
    $hooksDir = Join-Path $RepoPath ".git/hooks"
    $hookPath = Join-Path $hooksDir $PRE_COMMIT_HOOK_NAME
    
    # Check if .git exists
    if (-not (Test-Path (Join-Path $RepoPath ".git"))) {
        Write-Warning "Not a git repository: $RepoPath"
        return $false
    }
    
    # Create hooks directory if needed
    if (-not (Test-Path $hooksDir)) {
        New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null
    }
    
    # Define hook content inline (no separate file needed)
    # Uses bash shebang to call PowerShell for Windows Git compatibility
    $hookContent = @'
#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════════
# PRE-COMMIT HOOK - Auto-installed by sync_copilot_instructions.ps1
# ═══════════════════════════════════════════════════════════════════════════
# This hook runs before every commit to:
#   1. Update docs from code comments (extract_docs.ps1)
#   2. Sync docs across all repos (sync_copilot_instructions.ps1)
#
# Docs remain private - they are excluded via .git/info/exclude
# ═══════════════════════════════════════════════════════════════════════════

# Call PowerShell to run the actual hook logic
exec pwsh -NoProfile -ExecutionPolicy Bypass -Command '
$ErrorActionPreference = "Continue"

# Find repo root (where .git is)
$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) {
    Write-Host "⚠️  Could not determine repo root" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🔄 Pre-commit: Updating docs..." -ForegroundColor Cyan

# Step 1: Run extract_docs.ps1 (updates docs from code comments)
$extractScript = Join-Path $repoRoot "tools/extract_docs.ps1"
if (Test-Path $extractScript) {
    try {
        & $extractScript
        Write-Host "✅ extract_docs.ps1 completed" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  extract_docs.ps1 failed: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  extract_docs.ps1 not found, skipping" -ForegroundColor DarkGray
}

# Step 2: Run sync_copilot_instructions.ps1 (syncs docs across repos)
$syncScript = Join-Path $repoRoot "tools/sync_copilot_instructions.ps1"
if (Test-Path $syncScript) {
    try {
        # Pass a flag to prevent recursive hook installation during sync
        $env:SKIP_HOOK_INSTALL = "1"
        & $syncScript
        $env:SKIP_HOOK_INSTALL = $null
        Write-Host "✅ sync_copilot_instructions.ps1 completed" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  sync_copilot_instructions.ps1 failed: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  sync_copilot_instructions.ps1 not found, skipping" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "✅ Pre-commit hook completed" -ForegroundColor Green
Write-Host ""

# Always allow commit to proceed (docs are private anyway)
exit 0
'
'@
    
    # Check if hook exists and compare content
    $needsUpdate = $true
    if (Test-Path $hookPath) {
        $existingContent = Get-Content $hookPath -Raw -ErrorAction SilentlyContinue
        if ($existingContent -eq $hookContent) {
            $needsUpdate = $false
        }
    }
    
    if ($needsUpdate) {
        try {
            Set-Content -Path $hookPath -Value $hookContent -Force -NoNewline
            Write-Success "Installed pre-commit hook in $(Split-Path $RepoPath -Leaf)"
            return $true
        } catch {
            Write-Error "Failed to install pre-commit hook: $_"
            return $false
        }
    } else {
        Write-Info "Pre-commit hook up-to-date in $(Split-Path $RepoPath -Leaf)"
        return $false
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# CONFIG-DRIVEN PROJECT SYNC ORCHESTRATION
# ═══════════════════════════════════════════════════════════════════════════

# Ensure docs are excluded in a repo
function Ensure-DocsExcluded {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$RepoPath,
        
        [Parameter()]
        [string]$DocsPath = "docs/"
    )
    
    # Normalize the pattern
    $pattern = $DocsPath.TrimEnd('/\') + '/'
    
    Add-GitExclusion -RepoPath $RepoPath -Pattern $pattern | Out-Null
}

# Backup docs to archive (for solo projects)
# Uses BackupOnly mode to prevent deleted files from being restored
function Backup-DocsToArchive {
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)]
        [string]$SourceDocsPath,
        
        [Parameter(Mandatory)]
        [string]$ArchivePath,
        
        [Parameter(Mandatory)]
        [string]$ProjectName,
        
        [switch]$BackupOnly
    )
    
    $targetPath = Join-Path $ArchivePath $ProjectName
    
    if (-not (Test-Path $SourceDocsPath)) {
        Write-Warning "Source docs not found: $SourceDocsPath"
        return $false
    }
    
    try {
        # Create archive directory if not exists
        if (-not (Test-Path $targetPath)) {
            New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
        }
        
        # Use file-level sync with BackupOnly to prevent zombie files
        $syncResult = Sync-DocsNewestWins -SourcePath $SourceDocsPath -TargetPath $targetPath -BackupOnly:$BackupOnly
        
        $srcToTgt = $syncResult.SourceToTarget.Count
        $tgtToSrc = $syncResult.TargetToSource.Count
        $skipped = $syncResult.Skipped.Count
        
        if ($srcToTgt -gt 0 -or $tgtToSrc -gt 0) {
            # Increment version
            $sourceVersion = Get-DocVersion -DocsPath $SourceDocsPath
            $newVersion = Get-IncrementedVersion -CurrentVersion $sourceVersion
            Update-DocVersion -DocsPath $targetPath -NewVersion $newVersion -RepoName $ProjectName -Action "Backed up from source"
            Update-DocVersion -DocsPath $SourceDocsPath -NewVersion $newVersion -RepoName $ProjectName -Action "Backed up to archive"
            
            $mode = if ($BackupOnly) { "backup-only" } else { "bidirectional" }
            Write-Success "Backed up $ProjectName docs (v$newVersion, $mode, $srcToTgt→ $tgtToSrc←)"
            return $true
        } else {
            $sourceVersion = Get-DocVersion -DocsPath $SourceDocsPath
            Write-Info "No changes to backup for $ProjectName (v$sourceVersion)"
            return $false
        }
    } catch {
        Write-Error "Failed to backup $ProjectName docs: $_"
        return $false
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# FILE-LEVEL SYNC WITH NEWEST-WINS
# ═══════════════════════════════════════════════════════════════════════════

function Sync-DocsNewestWins {
    <#
    .SYNOPSIS
        Syncs two docs folders using file-level newest-wins strategy.
    
    .DESCRIPTION
        Instead of copying entire folder based on version, compares each file
        by LastWriteTime and syncs the newer version in each direction.
        This preserves newer individual files even if folder version is lower.
        
        When BackupOnly is true, only copies Source→Target (no reverse sync).
        Files that exist only in Target are NOT copied back to Source.
        This prevents deleted files from being restored from backups/archives.
    
    .PARAMETER SourcePath
        First docs folder path (primary/authoritative when BackupOnly=true).
    
    .PARAMETER TargetPath
        Second docs folder path (backup/archive when BackupOnly=true).
    
    .PARAMETER ExcludeFiles
        Files to skip during sync (e.g., .doc-version.yaml).
    
    .PARAMETER BackupOnly
        If true, only sync Source→Target. Target-only files are ignored.
        Use this for archive/backup targets to prevent deleted files from returning.
    #>
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
    
    # Normalize paths - convert to canonical form to prevent Substring errors
    # This handles: trailing slashes, double backslashes, mixed slash styles
    $SourcePath = [System.IO.Path]::GetFullPath($SourcePath).TrimEnd('\', '/')
    $TargetPath = [System.IO.Path]::GetFullPath($TargetPath).TrimEnd('\', '/')
    
    # Get all files from both directories (recursively)
    $sourceFiles = @{}
    $targetFiles = @{}
    
    if (Test-Path $SourcePath) {
        Get-ChildItem -Path $SourcePath -File -Recurse | ForEach-Object {
            $fullPath = $_.FullName
            if ($fullPath.Length -gt $SourcePath.Length) {
                $relativePath = $fullPath.Substring($SourcePath.Length).TrimStart('\', '/')
                # Skip garbage/malformed filenames and excluded files
                $isGarbage = $_.Name -match $GARBAGE_FILENAME_PATTERN
                if ($relativePath -notin $ExcludeFiles -and ($_.Name -notin $ExcludeFiles) -and (-not $isGarbage)) {
                    $sourceFiles[$relativePath] = $_
                }
            }
        }
    }
    
    if (Test-Path $TargetPath) {
        Get-ChildItem -Path $TargetPath -File -Recurse | ForEach-Object {
            $fullPath = $_.FullName
            if ($fullPath.Length -gt $TargetPath.Length) {
                $relativePath = $fullPath.Substring($TargetPath.Length).TrimStart('\', '/')
                # Skip garbage/malformed filenames and excluded files
                $isGarbage = $_.Name -match $GARBAGE_FILENAME_PATTERN
                if ($relativePath -notin $ExcludeFiles -and ($_.Name -notin $ExcludeFiles) -and (-not $isGarbage)) {
                    $targetFiles[$relativePath] = $_
                }
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
                # This prevents deleted files from being restored from backups
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
                # Target is newer
                if ($BackupOnly) {
                    # BackupOnly mode: still copy newer target to source (it's genuinely newer)
                    # This allows edits made directly in backup to flow back
                    # But target-ONLY files (deleted from source) won't come back
                    Copy-Item -Path $targetFile.FullName -Destination $sourceFullPath -Force
                    $syncResults.TargetToSource += $relativePath
                } else {
                    # Bidirectional mode: copy to source
                    Copy-Item -Path $targetFile.FullName -Destination $sourceFullPath -Force
                    $syncResults.TargetToSource += $relativePath
                }
            }
            else {
                # Same time (within tolerance) → skip
                $syncResults.Skipped += $relativePath
            }
        }
    }
    
    return $syncResults
}

# Sync project using config (phase-aware)
function Sync-ProjectDocs {
    [CmdletBinding()]
    [OutputType([PSCustomObject])]
    param(
        [Parameter(Mandatory)]
        [string]$ProjectName,
        
        [Parameter(Mandatory)]
        [hashtable]$ProjectConfig,
        
        [Parameter(Mandatory)]
        [string]$ArchivePath,
        
        [Parameter(Mandatory)]
        [ref]$Results,
        
        [switch]$ArchiveBackupOnly
    )
    
    $sourceRepo = $ProjectConfig.source_repo
    $docsPath = $ProjectConfig.docs_path
    $phase = $ProjectConfig.phase
    $syncTargets = $ProjectConfig.sync_targets
    
    $sourceDocsPath = Join-Path $sourceRepo $docsPath
    
    Write-Host ""
    Write-Host "─── $ProjectName ($phase) ───" -ForegroundColor Cyan
    
    # Ensure source docs exist
    if (-not (Test-Path $sourceDocsPath)) {
        Write-Warning "Docs not found: $sourceDocsPath"
        return
    }
    
    # Always ensure docs are excluded in source repo
    Ensure-DocsExcluded -RepoPath $sourceRepo -DocsPath $docsPath
    
    switch ($phase) {
        "solo" {
            # Solo phase: just backup to archive
            if (Backup-DocsToArchive -SourceDocsPath $sourceDocsPath -ArchivePath $ArchivePath -ProjectName $ProjectName -BackupOnly:$ArchiveBackupOnly) {
                $Results.Value.DocsBackedUp++
            }
        }
        
        "integrated" {
            # Integrated phase: file-level bidirectional sync (newest-wins) + backup
            
            # Get current versions for logging
            $sourceVersion = Get-DocVersion -DocsPath $sourceDocsPath
            if ($sourceVersion) {
                Write-Info "  Source: v$sourceVersion"
            }
            
            foreach ($target in $syncTargets) {
                if (-not (Test-Path $target.repo)) { continue }
                
                $targetDocsPath = Join-Path $target.repo $target.docs_path
                if (Test-Path $targetDocsPath) {
                    $targetVersion = Get-DocVersion -DocsPath $targetDocsPath
                    $repoName = Split-Path $target.repo -Leaf
                    if ($targetVersion) {
                        Write-Info "  Target ($repoName): v$targetVersion"
                    }
                }
            }
            
            # Get branch name for version tracking
            $branchName = "unknown"
            Push-Location $sourceRepo
            try {
                $branchName = git rev-parse --abbrev-ref HEAD 2>$null
                if ([string]::IsNullOrWhiteSpace($branchName)) { $branchName = "unknown" }
            } finally { Pop-Location }
            
            # Sync source with each target using file-level newest-wins
            $totalSynced = 0
            
            foreach ($target in $syncTargets) {
                if (-not (Test-Path $target.repo)) {
                    Write-Warning "Target repo not found: $($target.repo)"
                    continue
                }
                
                $targetDocsPath = Join-Path $target.repo $target.docs_path
                $repoName = Split-Path $target.repo -Leaf
                
                # Ensure target directory exists
                if (-not (Test-Path $targetDocsPath)) {
                    New-Item -ItemType Directory -Path $targetDocsPath -Force | Out-Null
                }
                
                # File-level sync with newest-wins
                $syncResult = Sync-DocsNewestWins -SourcePath $sourceDocsPath -TargetPath $targetDocsPath
                
                $srcToTgt = $syncResult.SourceToTarget.Count
                $tgtToSrc = $syncResult.TargetToSource.Count
                
                if ($srcToTgt -gt 0 -or $tgtToSrc -gt 0) {
                    Write-Host "  → ${repoName}: " -NoNewline
                    if ($srcToTgt -gt 0) {
                        Write-Host "$srcToTgt→" -ForegroundColor Green -NoNewline
                    }
                    if ($tgtToSrc -gt 0) {
                        Write-Host " ←$tgtToSrc" -ForegroundColor Cyan -NoNewline
                    }
                    Write-Host ""
                    
                    # Log individual files if verbose
                    if ($VerbosePreference -eq 'Continue') {
                        foreach ($f in $syncResult.SourceToTarget) {
                            Write-Verbose "    → $f (source newer)"
                        }
                        foreach ($f in $syncResult.TargetToSource) {
                            Write-Verbose "    ← $f (target newer)"
                        }
                    }
                    
                    $totalSynced += $srcToTgt + $tgtToSrc
                    
                    # Update version tracking
                    $currentSourceVer = Get-DocVersion -DocsPath $sourceDocsPath
                    $currentTargetVer = Get-DocVersion -DocsPath $targetDocsPath
                    $maxVer = if ($currentSourceVer -gt $currentTargetVer) { $currentSourceVer } else { $currentTargetVer }
                    $newVersion = Get-IncrementedVersion -CurrentVersion $maxVer
                    
                    Update-DocVersion -DocsPath $sourceDocsPath -NewVersion $newVersion -RepoName $ProjectName -BranchName $branchName -Action "File-sync with $repoName"
                    Update-DocVersion -DocsPath $targetDocsPath -NewVersion $newVersion -RepoName $repoName -BranchName $branchName -Action "File-sync with $ProjectName"
                    
                    Write-Success "$repoName synced (v$newVersion)"
                } else {
                    Write-Info "$repoName is up-to-date"
                }
                
                # Ensure docs excluded in target
                Ensure-DocsExcluded -RepoPath $target.repo -DocsPath $target.docs_path
                
                $Results.Value.DocsSynced++
            }
            
            # Also backup to archive
            if (Backup-DocsToArchive -SourceDocsPath $sourceDocsPath -ArchivePath $ArchivePath -ProjectName $ProjectName -BackupOnly:$ArchiveBackupOnly) {
                $Results.Value.DocsBackedUp++
            }
        }
    }
}

# Sync all projects from config
function Sync-AllProjectDocs {
    [CmdletBinding()]
    [OutputType([PSCustomObject])]
    param(
        [Parameter(Mandatory)]
        [ref]$Results
    )
    
    Write-SectionDivider -Title "PROJECT DOCS SYNC"
    
    $config = Load-SyncConfig
    
    if (-not $config) {
        Write-Warning "No config loaded, using legacy pillar_snapper sync"
        # Fall back to legacy function
        $legacyResult = Sync-PillarSnapperDocs
        return $legacyResult
    }
    
    $archivePath = $config.global.archive_path
    $archiveBackupOnly = $config.global.archive_backup_only -eq $true
    
    if ($archiveBackupOnly) {
        Write-Info "Archive mode: backup-only (deleted files won't return)"
    }
    
    # Ensure archive exists
    if (-not (Test-Path $archivePath)) {
        New-Item -ItemType Directory -Path $archivePath -Force | Out-Null
        Write-Success "Created archive directory: $archivePath"
        
        # Initialize as git repo
        Push-Location $archivePath
        git init 2>$null | Out-Null
        Pop-Location
    }
    
    # Sync each project
    foreach ($projectName in $config.projects.Keys) {
        $projectConfig = $config.projects[$projectName]
        Sync-ProjectDocs -ProjectName $projectName -ProjectConfig $projectConfig -ArchivePath $archivePath -Results $Results -ArchiveBackupOnly:$archiveBackupOnly
    }
    
    # Commit archive changes
    Push-Location $archivePath
    $changes = git status --porcelain 2>$null
    if ($changes) {
        git add -A 2>$null | Out-Null
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
        git commit -m "docs backup $timestamp" 2>$null | Out-Null
        Write-Success "Archive committed"
    }
    Pop-Location
    
    Write-Host ""
    Write-Success "Project docs sync complete"
}

# Main execution
Write-Host ""
Write-Host ("═" * 60) -ForegroundColor Cyan
Write-Host " UNIFIED PERSONAL SYNC v$SCRIPT_VERSION" -ForegroundColor Cyan
Write-Host ("═" * 60) -ForegroundColor Cyan
Write-Host ""

# Step -1: Run Pester tests before sync (unless -SkipTests is specified)
$testPath = Join-Path $PSScriptRoot "tests"
if ($SkipTests) {
    Write-Host "⏭️  Skipping pre-sync tests (-SkipTests specified)" -ForegroundColor Yellow
    Write-Host ""
} elseif (Test-Path $testPath) {
    Write-Host "Running pre-sync tests..." -ForegroundColor Yellow
    $testResult = Invoke-Pester -Path $testPath -PassThru -Quiet
    if ($testResult.FailedCount -gt 0) {
        Write-Host ""
        Write-Host "❌ PRE-SYNC TESTS FAILED ($($testResult.FailedCount) failures)" -ForegroundColor Red
        Write-Host "   Sync aborted to prevent propagating broken code." -ForegroundColor Red
        Write-Host "   Run 'Invoke-Pester -Path .\tools\tests\' for details." -ForegroundColor Yellow
        Write-Host "   Or use -SkipTests to bypass (emergency only)." -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
    Write-Host "✅ Pre-sync tests passed ($($testResult.PassedCount) tests)" -ForegroundColor Green
    Write-Host ""
}

# Load config
$config = Load-SyncConfig
if ($config) {
    Write-Success "Loaded config from: $SYNC_CONFIG_PATH"
    Write-Info "  Projects: $($config.projects.Count)"
    Write-Info "  Repos: $($config.all_repos.Count)"
} else {
    Write-Warning "Using legacy hardcoded configuration"
}

# Get target repos from config or fallback
$TARGET_REPOS = if ($config) { $config.all_repos } else {
    @(
        "C:\Users\ziyil\coding_projects\pillar_snapper",
        "C:\Users\ziyil\coding_projects\ai-file-search",
        "C:\Users\ziyil\coding_projects\GetSpace",
        "C:\Users\ziyil\coding_projects\GetSpace_branch"
    )
}

# Validate repository paths
$TARGET_REPOS = $TARGET_REPOS | Where-Object { 
    if (Test-Path $_) { 
        $true 
    } else { 
        Write-Warning "Repository path does not exist, will be skipped: $_"
        $false 
    }
}


# ═══════════════════════════════════════════════════════════════════════════
# FIX: Sync .NET current directory with PowerShell location
# [System.IO.Path]::GetFullPath() uses .NET's Directory.GetCurrentDirectory()
# which may differ from PowerShell's $PWD when running from VS Code.
# This ensures relative paths (like archive_path) resolve correctly.
# ═══════════════════════════════════════════════════════════════════════════
[System.IO.Directory]::SetCurrentDirectory($PWD.Path)
Write-Info -Message "Starting sync..."
Write-Host ""

# Step 1: Ensure all repos have required directories
Write-SectionDivider -Title "Step 1: Repository Preparation"

foreach ($repo in $TARGET_REPOS) {
    $repoName = Split-Path $repo -Leaf
    
    # Ensure .github directory exists
    $githubDir = Join-Path $repo $GITHUB_DIR
    if (-not (Test-Path $githubDir)) {
        New-Item -ItemType Directory -Path $githubDir -Force | Out-Null
        Write-Success "Created $GITHUB_DIR in $repoName"
    }
    
    # Ensure .github/rules directory exists
    $rulesDir = Join-Path $repo $GITHUB_RULES_DIR
    if (-not (Test-Path $rulesDir)) {
        New-Item -ItemType Directory -Path $rulesDir -Force | Out-Null
        Write-Success "Created $GITHUB_RULES_DIR in $repoName"
    }
    
    # Ensure tools directory exists
    $toolsDir = Join-Path $repo $TOOLS_DIR
    if (-not (Test-Path $toolsDir)) {
        New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
        Write-Success "Created $TOOLS_DIR in $repoName"
    }
    
    # Ensure tools/tests directory exists
    $testsDir = Join-Path $repo $TOOLS_TESTS_DIR
    if (-not (Test-Path $testsDir)) {
        New-Item -ItemType Directory -Path $testsDir -Force | Out-Null
        Write-Success "Created $TOOLS_TESTS_DIR in $repoName"
    }
}

Write-Info "All repositories prepared"
Write-Host ""Write-Host ""

# Step 2: Sync protocol files using newest-wins strategy
Write-SectionDivider -Title "Step 2: Newest-Wins Sync"
$results = New-SyncResult

Write-Info "Using newest-wins strategy: edit from any repo, newest file wins"
Write-Host ""

# 2a. Sync copilot-instructions.md (newest wins across all repos)
Write-Info "Syncing copilot-instructions.md..."
$copilotResult = Sync-FileNewestWinsAllRepos `
    -RelativePath "$GITHUB_DIR/$COPILOT_FILE_NAME" `
    -AllRepos $TARGET_REPOS `
    -Description "copilot-instructions.md"
$results.Synced += $copilotResult.SyncedCount
$results.Skipped += $copilotResult.SkippedCount

# 2b. Sync sync script (newest wins)
Write-Host ""
Write-Info "Syncing sync script..."
$scriptResult = Sync-FileNewestWinsAllRepos `
    -RelativePath "$TOOLS_DIR/$SCRIPT_NAME" `
    -AllRepos $TARGET_REPOS `
    -Description $SCRIPT_NAME
$results.ScriptsSynced += $scriptResult.SyncedCount

# 2c. Sync extract_docs.ps1 (newest wins)
Write-Host ""
Write-Info "Syncing extract_docs.ps1..."
$extractResult = Sync-FileNewestWinsAllRepos `
    -RelativePath "$TOOLS_DIR/$EXTRACT_DOCS_SCRIPT_NAME" `
    -AllRepos $TARGET_REPOS `
    -Description $EXTRACT_DOCS_SCRIPT_NAME
$results.ScriptsSynced += $extractResult.SyncedCount

# 2d. Sync init_protocol.ps1 (newest wins)
Write-Host ""
Write-Info "Syncing init_protocol.ps1..."
$initResult = Sync-FileNewestWinsAllRepos `
    -RelativePath "$TOOLS_DIR/init_protocol.ps1" `
    -AllRepos $TARGET_REPOS `
    -Description "init_protocol.ps1"
$results.ScriptsSynced += $initResult.SyncedCount

# 2e. Sync .github/rules/ folder (newest wins per file)
Write-Host ""
Write-Info "Syncing .github/rules/..."
$rulesResult = Sync-FolderNewestWinsAllRepos `
    -RelativeFolderPath $GITHUB_RULES_DIR `
    -AllRepos $TARGET_REPOS `
    -FilePattern "*.md" `
    -Description ".github/rules/"
$results.RulesSynced += $rulesResult.SyncedCount

# 2f. DEPRECATED - Protocol files moved to .github/rules/
# ═══════════════════════════════════════════════════════════════════════════
# WARNING: .github/protocol-changelog.md and .github/protocol-evolution.md
# have been moved to .github/rules/PROTOCOL_CHANGELOG.md and PROTOCOL_EVOLUTION.md
# The old files should be DELETED from all repos. They are now synced via
# the rules folder sync (step 2e) with uppercase naming convention.
# DO NOT re-add files to $PROTOCOL_FILES - it will cause sync conflicts.
# ═══════════════════════════════════════════════════════════════════════════

# 2g. Sync tools/tests/ folder (newest wins per file)
Write-Host ""
Write-Info "Syncing tools/tests/..."
$testsResult = Sync-FolderNewestWinsAllRepos `
    -RelativeFolderPath $TOOLS_TESTS_DIR `
    -AllRepos $TARGET_REPOS `
    -FilePattern "*.ps1" `
    -Description "tools/tests/"
$results.TestsSynced += $testsResult.SyncedCount

# 2h. Sync .claude/commands/ folder (Claude Code slash commands)
Write-Host ""
Write-Info "Syncing .claude/commands/..."
# First ensure .claude/commands directory exists in all repos
foreach ($repo in $TARGET_REPOS) {
    $commandsDir = Join-Path $repo $CLAUDE_COMMANDS_DIR
    if (-not (Test-Path $commandsDir)) {
        New-Item -ItemType Directory -Path $commandsDir -Force | Out-Null
        Write-Success "Created $CLAUDE_COMMANDS_DIR in $(Split-Path $repo -Leaf)"
    }
}
$commandsResult = Sync-FolderNewestWinsAllRepos `
    -RelativeFolderPath $CLAUDE_COMMANDS_DIR `
    -AllRepos $TARGET_REPOS `
    -FilePattern "*.md" `
    -Description ".claude/commands/"
$results.CommandsSynced += $commandsResult.SyncedCount

# 2h-2. Sync .claude/skills/ folder (Claude Code auto-triggered skills)
Write-Host ""
Write-Info "Syncing .claude/skills/..."
$CLAUDE_SKILLS_DIR = ".claude/skills"
# First ensure .claude/skills directory exists in all repos
foreach ($repo in $TARGET_REPOS) {
    $skillsDir = Join-Path $repo $CLAUDE_SKILLS_DIR
    if (-not (Test-Path $skillsDir)) {
        New-Item -ItemType Directory -Path $skillsDir -Force | Out-Null
        Write-Success "Created $CLAUDE_SKILLS_DIR in $(Split-Path $repo -Leaf)"
    }
}
# Gather all unique skill folder names from all repos
$allSkillFolders = @{}
foreach ($repo in $TARGET_REPOS) {
    $skillsPath = Join-Path $repo $CLAUDE_SKILLS_DIR
    if (Test-Path $skillsPath) {
        Get-ChildItem -Path $skillsPath -Directory | ForEach-Object {
            $allSkillFolders[$_.Name] = $true
        }
    }
}
# Sync each skill folder (newest wins per file within each skill)
$skillsSyncedCount = 0
foreach ($skillName in $allSkillFolders.Keys) {
    $skillRelativePath = "$CLAUDE_SKILLS_DIR/$skillName"
    Write-Info "  Syncing skill: $skillName"
    $skillResult = Sync-FolderNewestWinsAllRepos `
        -RelativeFolderPath $skillRelativePath `
        -AllRepos $TARGET_REPOS `
        -FilePattern "*" `
        -Description "$skillName/"
    $skillsSyncedCount += $skillResult.SyncedCount
}
Write-Info "  Skills synced: $skillsSyncedCount files across $($allSkillFolders.Count) skills"

# 2i. Generate CLAUDE.md in all repos (for Claude Code extension)
Write-Host ""
Write-Info "Generating CLAUDE.md files..."
foreach ($repo in $TARGET_REPOS) {
    $copilotPath = Join-Path $repo "$GITHUB_DIR/$COPILOT_FILE_NAME"
    $claudePath = Join-Path $repo $CLAUDE_MD_FILE_NAME
    
    if (Test-Path $copilotPath) {
        $copilotContent = Get-Content $copilotPath -Raw
        $versionMatch = [regex]::Match($copilotContent, $VERSION_REGEX)
        $version = if ($versionMatch.Success) { $versionMatch.Groups[1].Value } else { "unknown" }
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        
        # Fix relative paths: CLAUDE.md is at root, so rules/ → .github/rules/
        # Patterns to fix:
        #   [rules/FILE.md](rules/FILE.md)  → [.github/rules/FILE.md](.github/rules/FILE.md)
        #   See [rules/FILE.md]             → See [.github/rules/FILE.md]
        $copilotContentFixed = $copilotContent `
            -replace '\]\(rules/', '](.github/rules/' `
            -replace '\[rules/', '[.github/rules/'
        
        $claudeContent = @"
# CLAUDE.md
# ═══════════════════════════════════════════════════════════════════════════
# ⚠️  AUTO-GENERATED - DO NOT EDIT DIRECTLY
# ═══════════════════════════════════════════════════════════════════════════
# Source:    .github/copilot-instructions.md
# Version:   v$version
# Generated: $timestamp
# 
# To update: Edit .github/copilot-instructions.md, then run:
#            .\tools\sync_copilot_instructions.ps1
# ═══════════════════════════════════════════════════════════════════════════

$copilotContentFixed
"@
        Set-Content $claudePath -Value $claudeContent -Encoding UTF8
        Write-Host "    ✅ $repo" -ForegroundColor Green
        $results.ClaudeMdGenerated++
    } else {
        Write-Host "    ⏭️  $repo (no copilot-instructions.md)" -ForegroundColor DarkGray
    }
}

# 2j. Ensure git exclusions in all repos
Write-Host ""
Write-Info "Ensuring git exclusions..."
foreach ($repo in $TARGET_REPOS) {
    Add-GitExclusion -RepoPath $repo -Pattern $COPILOT_EXCLUDE_PATTERN | Out-Null
    Add-GitExclusion -RepoPath $repo -Pattern $SCRIPT_EXCLUDE_PATTERN | Out-Null
    Add-GitExclusion -RepoPath $repo -Pattern $GITHUB_RULES_EXCLUDE_PATTERN | Out-Null
    Add-GitExclusion -RepoPath $repo -Pattern $PROTOCOL_FILES_EXCLUDE_PATTERN | Out-Null
    Add-GitExclusion -RepoPath $repo -Pattern $TOOLS_TESTS_EXCLUDE_PATTERN | Out-Null
    Add-GitExclusion -RepoPath $repo -Pattern $TMP_EXCLUDE_PATTERN | Out-Null
    Add-GitExclusion -RepoPath $repo -Pattern $CLAUDE_MD_EXCLUDE_PATTERN | Out-Null
    Add-GitExclusion -RepoPath $repo -Pattern $CLAUDE_COMMANDS_EXCLUDE_PATTERN | Out-Null
}

# 2k. Install pre-commit hooks in all repos (skip if called from hook to prevent recursion)
if ($env:SKIP_HOOK_INSTALL -ne "1") {
    Write-Host ""
    Write-Info "Installing pre-commit hooks..."
    foreach ($repo in $TARGET_REPOS) {
        if (Install-PreCommitHook -RepoPath $repo) {
            $results.HooksInstalled++
        }
    }
} else {
    Write-Host ""
    Write-Info "Skipping hook installation (called from pre-commit hook)"
}

# Step 3: Sync all project docs (config-driven, phase-aware)
Sync-AllProjectDocs -Results ([ref]$results)

# Summary
Write-SectionDivider -Title "Sync Summary"
Write-Host "  Sync Strategy:      Newest Wins (edit from any repo)" -ForegroundColor Cyan
Write-Host "  Script Version:     v$SCRIPT_VERSION"
Write-Host "  Total Repos:        $($TARGET_REPOS.Count)"
Write-Host ""
Write-Host "  Protocol Files:" -ForegroundColor Cyan
Write-Host "    Copilot Files:    $($results.Synced)"
Write-Host "    CLAUDE.md Gen:    $($results.ClaudeMdGenerated)"
Write-Host "    Scripts Synced:   $($results.ScriptsSynced)"
Write-Host "    Rules Synced:     $($results.RulesSynced)"
Write-Host "    Tests Synced:     $($results.TestsSynced)"
Write-Host "    Commands Synced:  $($results.CommandsSynced)"
Write-Host "    Hooks Installed:  $($results.HooksInstalled)"
Write-Host "    Files Skipped:    $($results.Skipped)"
Write-Host "    Files Untracked:  $($results.Untracked)"
Write-Host "    Exclusions Added: $($results.Excluded)"
Write-Host "    Verified Ignored: $($results.Verified)"
Write-Host ""
Write-Host "  Project Docs:" -ForegroundColor Cyan
Write-Host "    Docs Synced:      $($results.DocsSynced)"
Write-Host "    Docs Backed Up:   $($results.DocsBackedUp)"
Write-Host ("═" * 60) -ForegroundColor Cyan

if ($results.Synced -gt 0 -or $results.RulesSynced -gt 0 -or $results.DocsSynced -gt 0 -or $results.DocsBackedUp -gt 0) {
    Write-Host ""
    Write-Success -Message "Sync completed successfully!"
    
    # Reminder if copilot-instructions was synced (version likely changed)
    if ($results.Synced -gt 0) {
        Write-Host ""
        Write-Host "  ⚠️  REMINDER: If version changed, update .github/protocol-changelog.md" -ForegroundColor Yellow
    }
    
    exit 0
} elseif ($results.Skipped -eq $TARGET_REPOS.Count) {
    Write-Host ""
    Write-Info -Message "All targets are up-to-date or skipped."
    exit 0
} else {
    Write-Host ""
    Write-Warning -Message "Some operations may have been skipped. Review output above."
    exit 0
}
