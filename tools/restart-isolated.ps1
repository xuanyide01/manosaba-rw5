$projectRoot = Split-Path -Parent $PSScriptRoot
$environment = Join-Path $projectRoot '../manosaba-environment'
$recordFile = Join-Path $environment 'controller-pid.json'
if (Test-Path -LiteralPath $recordFile) {
    $record = Get-Content -LiteralPath $recordFile -Raw | ConvertFrom-Json
    $scriptPath = [IO.Path]::GetFullPath($record.script)
    if ($scriptPath -notmatch '[\\/]work[\\/]manosaba-rw5[\\/]tools[\\/]emulator-server\.cjs$') { throw 'Controller belongs to another project' }
    if ((Get-FileHash -LiteralPath $scriptPath).Hash -ne (Get-FileHash -LiteralPath (Join-Path $PSScriptRoot 'emulator-server.cjs')).Hash) { throw 'Controller script does not match this project' }
    $controller = Get-CimInstance Win32_Process -Filter "ProcessId = $($record.pid)"
    if ($controller) {
        if ($controller.Name -ne 'node.exe' -or $controller.CommandLine -notmatch 'emulator-server\.cjs') { throw 'PID has been reused by an unrelated process' }
        $processes = @(Get-CimInstance Win32_Process)
        $owned = @([int]$record.pid)
        for ($pass = 0; $pass -lt 5; $pass++) {
            $children = @($processes | Where-Object { $_.ParentProcessId -in $owned -and $_.ProcessId -notin $owned })
            foreach ($child in $children) { $owned += [int]$child.ProcessId }
        }
        for ($i = $owned.Count - 1; $i -ge 0; $i--) { Stop-Process -Id $owned[$i] -ErrorAction SilentlyContinue }
    }
}
Start-Sleep -Milliseconds 1500
& (Join-Path $PSScriptRoot 'start-emulator.ps1') -SdkHome (Join-Path $projectRoot '../vela-environment/sdk') -EnvironmentHome $environment -NodeModulesPath (Join-Path $projectRoot '../starry-rw5/node_modules')
