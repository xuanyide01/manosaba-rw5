param(
    [string]$SdkHome,
    [string]$EnvironmentHome,
    [string]$NodeModulesPath
)
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not $EnvironmentHome) { $EnvironmentHome = Join-Path $project '.emulator' }
if (-not $SdkHome) { $SdkHome = Join-Path $EnvironmentHome 'sdk' }
New-Item -ItemType Directory -Path $EnvironmentHome -Force | Out-Null
if ($NodeModulesPath) { $env:NODE_PATH = $NodeModulesPath }
$env:STARRY_EMULATOR_HOME = $EnvironmentHome
$env:WATCH_SDK_HOME = $SdkHome
$env:WATCH_VVD_NAME = 'ManosabaRW5-432x514'
$env:STARRY_EMULATOR_PACKAGE = 'com.codex.manosaba.rw5'
$env:WATCH_SERIAL_PORT = '5592'
$env:WATCH_GRPC_PORT = '8592'
$env:WATCH_DEBUG_PORT = '10092'
$env:WATCH_CONTROL_PORT = '43146'
$node = (Get-Command node).Source
$process = Start-Process -FilePath $node -ArgumentList 'tools/emulator-server.cjs' -WorkingDirectory $project -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $EnvironmentHome 'controller-stdout.log') -RedirectStandardError (Join-Path $EnvironmentHome 'controller-stderr.log')
$process.Id
