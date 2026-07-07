# atelier installer for windows
param(
    [string]$Target = "claude",
    [string]$Rules = "all",
    [switch]$NoHooks,
    [string]$WithAdapters = ""
)

$ErrorActionPreference = "Stop"
$AtelierRoot = $PSScriptRoot

Write-Host "atelier installer"
Write-Host "  source:   $AtelierRoot"
Write-Host "  target:   $Target"
Write-Host "  rules:    $Rules"
Write-Host "  hooks:    $(if ($NoHooks) { 'no' } else { 'yes' })"
Write-Host "  adapters: $(if ($WithAdapters) { $WithAdapters } else { 'none' })"
Write-Host ""

if ($Target -eq "claude") {
    $ClaudeDir = Join-Path $env:USERPROFILE ".claude"
    if (-not (Test-Path $ClaudeDir)) { New-Item -ItemType Directory -Path $ClaudeDir | Out-Null }

    $LinkTarget = Join-Path $ClaudeDir "atelier"
    if (-not (Test-Path $LinkTarget)) {
        New-Item -ItemType Junction -Path $LinkTarget -Target $AtelierRoot | Out-Null
        Write-Host "linked $LinkTarget -> $AtelierRoot"
    } else {
        Write-Host "$LinkTarget already exists (skipping)"
    }

    if (-not $NoHooks) {
        $HooksTemplate = Join-Path $AtelierRoot "hooks\hooks.json"
        $Generated = Join-Path $ClaudeDir "atelier-hooks.json"
        # hooks.json ships with ${CLAUDE_PLUGIN_ROOT} for the claude code plugin loader; this
        # manual installer substitutes it (and any legacy ${STUDIO_ROOT}) with the local install path.
        $ResolvedRoot = $AtelierRoot.Replace('\','/')
        (Get-Content $HooksTemplate -Raw) -replace '\$\{CLAUDE_PLUGIN_ROOT\}', $ResolvedRoot -replace '\$\{STUDIO_ROOT\}', $ResolvedRoot | Set-Content $Generated
        Write-Host "wrote $Generated"
        Write-Host "next: merge the hooks key into $ClaudeDir\settings.json"
    }
}

if ($WithAdapters) {
    Write-Host ""
    Write-Host "note: adapter install scripts are bash. on windows, run them under WSL or git-bash:"
    foreach ($a in $WithAdapters.Split(',')) {
        $a = $a.Trim()
        $script = Join-Path $AtelierRoot "adapters\$a\install.sh"
        if (Test-Path $script) {
            Write-Host "  bash '$script'"
        } else {
            Write-Host "  unknown adapter: $a"
        }
    }
}

Write-Host ""
Write-Host "atelier installed."
Write-Host "see $AtelierRoot\ATELIER.md for the operator handbook."
