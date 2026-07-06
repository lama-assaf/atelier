# STUDIO installer for windows
param(
    [string]$Target = "claude",
    [string]$Rules = "all",
    [switch]$NoHooks,
    [string]$WithAdapters = ""
)

$ErrorActionPreference = "Stop"
$StudioRoot = $PSScriptRoot

Write-Host "STUDIO installer"
Write-Host "  source:   $StudioRoot"
Write-Host "  target:   $Target"
Write-Host "  rules:    $Rules"
Write-Host "  hooks:    $(if ($NoHooks) { 'no' } else { 'yes' })"
Write-Host "  adapters: $(if ($WithAdapters) { $WithAdapters } else { 'none' })"
Write-Host ""

if ($Target -eq "claude") {
    $ClaudeDir = Join-Path $env:USERPROFILE ".claude"
    if (-not (Test-Path $ClaudeDir)) { New-Item -ItemType Directory -Path $ClaudeDir | Out-Null }

    $LinkTarget = Join-Path $ClaudeDir "studio"
    if (-not (Test-Path $LinkTarget)) {
        New-Item -ItemType Junction -Path $LinkTarget -Target $StudioRoot | Out-Null
        Write-Host "linked $LinkTarget -> $StudioRoot"
    } else {
        Write-Host "$LinkTarget already exists (skipping)"
    }

    if (-not $NoHooks) {
        $HooksTemplate = Join-Path $StudioRoot "hooks\hooks.json"
        $Generated = Join-Path $ClaudeDir "studio-hooks.json"
        (Get-Content $HooksTemplate -Raw) -replace '\$\{STUDIO_ROOT\}', $StudioRoot.Replace('\','/') | Set-Content $Generated
        Write-Host "wrote $Generated"
        Write-Host "next: merge the hooks key into $ClaudeDir\settings.json"
    }
}

if ($WithAdapters) {
    Write-Host ""
    Write-Host "note: adapter install scripts are bash. on windows, run them under WSL or git-bash:"
    foreach ($a in $WithAdapters.Split(',')) {
        $a = $a.Trim()
        $script = Join-Path $StudioRoot "adapters\$a\install.sh"
        if (Test-Path $script) {
            Write-Host "  bash '$script'"
        } else {
            Write-Host "  unknown adapter: $a"
        }
    }
}

Write-Host ""
Write-Host "STUDIO installed."
Write-Host "see $StudioRoot\STUDIO.md for the operator handbook."
