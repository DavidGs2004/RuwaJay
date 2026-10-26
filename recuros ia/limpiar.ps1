$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$projectRoot = Split-Path -Parent $PSScriptRoot
$separator = [IO.Path]::DirectorySeparatorChar
# Lista cerrada: solo caches, dependencias reinstalables, salidas y plantilla sin uso.
$relativeTargets = @(
    '.artifacts', 'app/.artifacts', 'app/.gradle', 'app/.kotlin', 'app/build', 'app/app/build',
    'web/node_modules', 'web/dist', 'archivos varios/servicios/functions/node_modules',
    'cloudflared.exe', 'firestore-debug.log', 'web/firestore-debug.log',
    'web/firebase-debug.log', 'web/storage-debug.log', 'web/ui-debug.log',
    'web/src/main.ts', 'web/src/counter.ts', 'web/src/style.css',
    'web/src/assets/hero.png', 'web/src/assets/typescript.svg', 'web/src/assets/vite.svg',
    'web/scripts/dev.mjs', 'recuros ia/validacion', 'recuros ia/pruebas'
)
$checkedTargets = foreach ($relative in $relativeTargets) {
    $full = [IO.Path]::GetFullPath((Join-Path $projectRoot $relative))
    if (-not $full.StartsWith($projectRoot + $separator, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Ruta fuera del proyecto: $full"
    }
    if ($full -eq (Join-Path $projectRoot '.git')) { throw 'Git protegido.' }
    if (Test-Path -LiteralPath $full) {
        $cursor = $full
        while ($cursor -ne $projectRoot) {
            if ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "No se elimina una ruta enlazada: $cursor"
            }
            $cursor = Split-Path -Parent $cursor
        }
        [pscustomobject]@{ relative = $relative; full = $full }
    }
}
$deleted = foreach ($target in $checkedTargets) {
    $item = Get-Item -LiteralPath $target.full -Force
    $bytes = if ($item.PSIsContainer) {
        $measurement = @(Get-ChildItem -LiteralPath $target.full -Recurse -Force -File | Measure-Object -Property Length -Sum)
        if ($measurement.Count) { $measurement[0].Sum } else { 0 }
    } else { $item.Length }
    # Prefijo Win32 para los nombres largos generados por el compilador Kotlin.
    $nativePath = '\\?\' + $target.full
    Remove-Item -LiteralPath $nativePath -Recurse -Force
    [pscustomobject]@{ ruta = $target.relative; bytes = $bytes }
}
$deleted | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'limpieza.json') -Encoding UTF8
$total = ($deleted | Measure-Object -Property bytes -Sum).Sum
Write-Output ('Limpieza terminada. Espacio retirado: {0:N2} GiB en {1} rutas.' -f ($total / 1GB), @($deleted).Count)
