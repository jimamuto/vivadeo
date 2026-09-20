param(
    [Parameter(Mandatory = $true)] [string]$Url,
    [Parameter(Mandatory = $true)] [string]$Goal,
    [string]$RecordDir,
    [switch]$Screenshots
)

$vivadeoRoot = Split-Path -Parent $PSScriptRoot
$jevProject = if ($env:VIVADEO_JEV_PROJECT_DIR) { $env:VIVADEO_JEV_PROJECT_DIR } else { Join-Path (Split-Path -Parent $vivadeoRoot) "jev-ultrafast" }
$jevProject = (Resolve-Path -LiteralPath $jevProject).Path -replace '\\', '/'
$jevEnv = (Join-Path $jevProject ".env") -replace '\\', '/'
$runner = (Join-Path $PSScriptRoot "run_jev.py") -replace '\\', '/'

# Windows machines may deny uv access to its global cache. Keep the default
# cache inside the Vivadeo checkout, while allowing callers to override it.
if (-not $env:UV_CACHE_DIR) {
    $env:UV_CACHE_DIR = Join-Path $vivadeoRoot ".uv-cache-jev"
}
New-Item -ItemType Directory -Force -Path $env:UV_CACHE_DIR | Out-Null

if (-not (Test-Path -LiteralPath (Join-Path $jevProject "pyproject.toml"))) {
    throw "Jev project not found at $jevProject. Set VIVADEO_JEV_PROJECT_DIR to its checkout."
}

$arguments = @("run", "--project", $jevProject)
if (Test-Path -LiteralPath $jevEnv) { $arguments += @("--env-file", $jevEnv) }
$arguments += @("python", $runner, "--url", $Url, "--goal", $Goal)
if ($RecordDir) { $arguments += @("--record-dir", $RecordDir) }
if ($Screenshots) { $arguments += "--screenshots" }

# Vivadeo already owns the Jev credential; adapt its name to Jev's library API.
if (-not $env:TYPESAFE_API_KEY -and $env:VIVADEO_JEV_API_KEY) { $env:TYPESAFE_API_KEY = $env:VIVADEO_JEV_API_KEY }
if (-not $env:TEXT_MODEL_API_KEY -and $env:VIVADEO_JEV_TEXT_MODEL_API_KEY) { $env:TEXT_MODEL_API_KEY = $env:VIVADEO_JEV_TEXT_MODEL_API_KEY }

& uv @arguments
exit $LASTEXITCODE
