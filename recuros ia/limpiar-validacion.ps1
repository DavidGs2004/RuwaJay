$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\')
$tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
$targets = @()
foreach ($relative in @('web/node_modules', 'app/.kotlin', 'app/build', 'recuros ia/cache-gradle', 'recuros ia/cache-npm', 'recuros ia/validacion', 'recuros ia/pruebas')) {
    $full = [IO.Path]::GetFullPath((Join-Path $workspace $relative))
    if (-not $full.StartsWith($workspace + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Ruta fuera del proyecto.' }
    $targets += $full
}
foreach ($line in Get-Content -LiteralPath (Join-Path $PSScriptRoot 'ruta-validacion-android.txt')) {
    if (-not $line.Trim()) { continue }
    $full = [IO.Path]::GetFullPath($line.Trim())
    if (-not $full.StartsWith($tempBase + '\', [StringComparison]::OrdinalIgnoreCase) -or
        (Split-Path -Leaf $full) -notmatch '^ruwajay-ui-[0-9a-f]{32}$') { throw 'Temporal no reconocido.' }
    $targets += $full
}
# Todas las rutas se verifican antes de la primera eliminación recursiva.
foreach ($target in $targets) {
    if (Test-Path -LiteralPath $target) {
        if ((Get-Item -LiteralPath $target -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'No se eliminan enlaces.' }
    }
}
foreach ($target in $targets) {
    if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath ('\\?\' + $target) -Recurse -Force }
}
Write-Output 'Retiradas las dependencias y compilaciones temporales; se conserva entrega/ con APK y pruebas.'
