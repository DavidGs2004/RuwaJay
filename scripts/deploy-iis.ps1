[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][string]$BackupRoot
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$sourcePath = (Resolve-Path -LiteralPath $Source).Path.TrimEnd('\')
if (-not [IO.Path]::IsPathRooted($Destination) -or -not [IO.Path]::IsPathRooted($BackupRoot)) {
    throw 'Destination y BackupRoot deben ser rutas absolutas.'
}
$targetPath = [IO.Path]::GetFullPath($Destination).TrimEnd('\')
$backupPath = [IO.Path]::GetFullPath($BackupRoot).TrimEnd('\')
if ((Split-Path -Leaf $targetPath) -ine 'ruwajay') {
    throw 'El destino debe ser la carpeta exclusiva ruwajay; nunca wwwroot.'
}
foreach ($required in @('index.html', 'web.config', 'assets')) {
    if (-not (Test-Path -LiteralPath (Join-Path $sourcePath $required))) {
        throw "Build incompleto: falta $required."
    }
}
if ((Get-Content -LiteralPath (Join-Path $sourcePath 'index.html') -Raw) -notmatch '/ruwajay/assets/') {
    throw 'El build no fue compilado para /ruwajay/.'
}
if ($sourcePath -ieq $targetPath -or $sourcePath.StartsWith($targetPath + '\', [StringComparison]::OrdinalIgnoreCase) -or
    $targetPath.StartsWith($sourcePath + '\', [StringComparison]::OrdinalIgnoreCase) -or
    $backupPath -ieq $targetPath -or $backupPath.StartsWith($targetPath + '\', [StringComparison]::OrdinalIgnoreCase) -or
    $targetPath.StartsWith($backupPath + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Origen, destino y respaldos deben estar separados.'
}
# No permitir junctions/symlinks en las rutas de publicación.
foreach ($path in @($sourcePath, $targetPath, $backupPath)) {
    $cursor = $path
    while ($cursor) {
        if (Test-Path -LiteralPath $cursor) {
            if ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "No se permite un enlace de sistema de archivos: $cursor"
            }
        }
        $cursor = Split-Path -Parent $cursor
    }
}
foreach ($path in @($sourcePath, $targetPath)) {
    if (Test-Path -LiteralPath $path) {
        $links = @(Get-ChildItem -LiteralPath $path -Recurse -Force | Where-Object {
            $_.Attributes -band [IO.FileAttributes]::ReparsePoint
        })
        if ($links.Count) { throw 'El origen o destino contiene enlaces de sistema de archivos.' }
    }
}
function Copy-Tree([string]$From, [string]$To, [switch]$SkipIndex) {
    $copyArgs = @($From, $To, '/E', '/COPY:DAT', '/DCOPY:DAT', '/R:2', '/W:2', '/XJ', '/NP', '/NFL', '/NDL')
    if ($SkipIndex) { $copyArgs += @('/XF', 'index.html') }
    & robocopy @copyArgs
    if ($LASTEXITCODE -ge 8) { throw "Robocopy falló: $LASTEXITCODE" }
}

$snapshot = Join-Path $backupPath ((Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N'))
if (Test-Path -LiteralPath $targetPath) {
    New-Item -ItemType Directory -Path $snapshot -Force | Out-Null
    Copy-Tree $targetPath $snapshot
    Write-Host "Respaldo: $snapshot"
}
New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
# Copiar recursos primero; conservar hashes anteriores para pestañas ya abiertas.
Copy-Tree $sourcePath $targetPath -SkipIndex
$temporaryIndex = Join-Path $targetPath 'index.deploy.tmp'
Copy-Item -LiteralPath (Join-Path $sourcePath 'index.html') -Destination $temporaryIndex -Force
$liveIndex = Join-Path $targetPath 'index.html'
if (Test-Path -LiteralPath $liveIndex) {
    [IO.File]::Replace($temporaryIndex, $liveIndex, [NullString]::Value)
} else {
    [IO.File]::Move($temporaryIndex, $liveIndex)
}
Write-Host "Publicado en $targetPath"
# Robocopy usa códigos 1..7 para resultados correctos.
exit 0
