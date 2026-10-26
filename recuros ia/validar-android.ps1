$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
$validationPath = [IO.Path]::GetFullPath((Join-Path $tempBase ('ruwajay-ui-' + [guid]::NewGuid().ToString('N'))))
if (-not $validationPath.StartsWith($tempBase + '\', [StringComparison]::OrdinalIgnoreCase) -or $validationPath -match '[^\x00-\x7F]') {
    throw 'La validacion necesita un directorio temporal ASCII dentro de TEMP.'
}
New-Item -ItemType Directory -Path $validationPath | Out-Null
$validationPath | Add-Content -LiteralPath (Join-Path $PSScriptRoot 'ruta-validacion-android.txt') -Encoding UTF8
$source = Join-Path $workspace 'app'
foreach ($entry in @('app', 'gradle', 'gradlew', 'gradlew.bat', 'settings.gradle.kts', 'build.gradle.kts', 'gradle.properties')) {
    Copy-Item -LiteralPath (Join-Path $source $entry) -Destination $validationPath -Recurse
}
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.12'
$env:ANDROID_HOME = 'C:\Users\gochoa\AppData\Local\Android\Sdk'
$env:GRADLE_USER_HOME = 'C:\Users\gochoa\.gradle'
$validationResults = Join-Path $validationPath 'resultados'
$initScript = Join-Path $PSScriptRoot 'validar-android.init.gradle'
$log = Join-Path $PSScriptRoot 'validacion-android.log'
Push-Location $validationPath
try {
    & '.\gradlew.bat' --offline --init-script $initScript "-PruwaValidationRoot=$validationResults" :app:assembleDebug :app:testDebugUnitTest *> $log
    $result = $LASTEXITCODE
} finally { Pop-Location }
Get-Content -LiteralPath $log -Tail 35
if ($result -ne 0) { throw "La validacion fallo. Consulta $log" }
$delivery = Join-Path $PSScriptRoot 'entrega'
New-Item -ItemType Directory -Path $delivery -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $validationResults 'app/outputs/apk/debug/app-debug.apk') -Destination (Join-Path $delivery 'RuwaJay-publicacion-dpi-claro-debug.apk') -Force
Copy-Item -LiteralPath (Join-Path $validationResults 'app/test-results/testDebugUnitTest') -Destination (Join-Path $delivery 'pruebas-android') -Recurse -Force
Write-Output "APK y pruebas correctas guardados en $delivery"
