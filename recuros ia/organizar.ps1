$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$projectRoot = Split-Path -Parent $PSScriptRoot
$separator = [IO.Path]::DirectorySeparatorChar
if (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'inventario-original.json')) {
    throw 'La reorganizacion ya se ejecuto. Se conserva el inventario original.'
}
function Project-Path([string]$Relative) {
    $full = [IO.Path]::GetFullPath((Join-Path $projectRoot $Relative))
    if (-not $full.StartsWith($projectRoot + $separator, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Ruta fuera del proyecto: $Relative"
    }
    return $full
}
function Move-ProjectItem([string]$From, [string]$To) {
    $source = Project-Path $From
    $target = Project-Path $To
    if (-not (Test-Path -LiteralPath $source)) { throw "Falta origen: $From" }
    if (Test-Path -LiteralPath $target) { throw "Destino ocupado: $To" }
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Move-Item -LiteralPath $source -Destination $target
}

# Inventario de fuentes y documentos; excluye dependencias, Git y compilaciones.
$tracked = & git -C $projectRoot -c core.quotePath=false ls-files
if ($LASTEXITCODE -ne 0) { throw 'No se pudo inventariar Git.' }
$inventory = foreach ($relative in $tracked) {
    if ($relative -match '(^|/)\.artifacts/') { continue }
    $source = Project-Path $relative
    if (Test-Path -LiteralPath $source -PathType Leaf) {
        [pscustomobject]@{ original = $relative; sha256 = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash }
    }
}
$inventory | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'inventario-original.json') -Encoding UTF8

Move-ProjectItem 'android-app' 'app'
foreach ($item in @('src','public','scripts','tests','node_modules','dist','package.json','package-lock.json','vite.config.js','tsconfig.json','index.html','.env.example','Dockerfile','nginx.conf','playwright.config.js','playwright.public.config.js')) {
    Move-ProjectItem $item ('web/' + $item)
}
foreach ($item in @('functions','supabase','firebase.json','.firebaserc','firestore.rules','firestore.indexes.json','storage.rules')) {
    Move-ProjectItem $item ('archivos varios/servicios/' + $item)
}
foreach ($document in @(Get-ChildItem -LiteralPath $projectRoot -File -Filter '*.docx')) {
    Move-ProjectItem $document.Name ('archivos varios/documentacion/' + $document.Name)
}
foreach ($item in @('README.md','Documentacion_Tecnica_RuwaJay.md')) {
    Move-ProjectItem $item ('archivos varios/documentacion/' + $item)
}
Move-ProjectItem 'generar_docs.py' 'archivos varios/herramientas/generar_docs.py'
Move-ProjectItem 'bitacora.txt' 'recuros ia/historico/bitacora.txt'
Move-ProjectItem '.artifacts/releases/ruwajay-notificaciones-2.6.0-debug.apk' 'app/distribucion/ruwajay-notificaciones-2.6.0-debug.apk'
Move-ProjectItem '.artifacts/db-diagnostic' 'archivos varios/documentacion/diagnostico'
Write-Output 'Fuentes, documentos, servidor y APK actual organizados.'
