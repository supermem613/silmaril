[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$VaultPath
)

$ErrorActionPreference = 'Stop'

$pluginDirectory = $PSScriptRoot
$vaultDirectory = (Resolve-Path -LiteralPath $VaultPath).Path
$targetDirectory = Join-Path $vaultDirectory '.obsidian\plugins\silmaril-obsidian'
$releaseFiles = @('main.js', 'manifest.json', 'styles.css')

Push-Location $pluginDirectory
try {
    & npm install --no-package-lock
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed with exit code $LASTEXITCODE."
    }

    & npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Plugin build failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}

foreach ($fileName in $releaseFiles) {
    $sourcePath = Join-Path $pluginDirectory $fileName
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Plugin build did not produce $sourcePath."
    }
}

New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null

foreach ($fileName in $releaseFiles) {
    Copy-Item `
        -LiteralPath (Join-Path $pluginDirectory $fileName) `
        -Destination $targetDirectory `
        -Force
}

Write-Output "Installed Silmaril to $targetDirectory"
