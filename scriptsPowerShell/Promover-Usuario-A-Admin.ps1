# ==============================================================================
# Script: Promover-Usuario-A-Admin.ps1
# Asigna el rol 'admin' a cualquier usuario o correo de Google en MongoDB
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  ASIGNAR ROL DE ADMINISTRADOR A USUARIO / GOOGLE EMAIL   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$identificador = Read-Host "Ingresa el usuario o correo de Google a promover como ADMIN (ej: mi_correo@gmail.com)"

if (-not $identificador) {
    Write-Host "`n[ERROR] El identificador no puede estar vacio." -ForegroundColor Red
    exit
}

# Localizar el script ejecutor manage_user.cjs
$possiblePaths = @(
    (Join-Path $PSScriptRoot "manage_user.cjs"),
    (Join-Path $PSScriptRoot "..\backend\scripts\manage_user.cjs"),
    "c:\Users\asm\Desktop\lvasquez-2025014--BIM4\scriptsPowerShell\manage_user.cjs",
    "c:\Users\asm\Desktop\lvasquez-2025014--BIM4\scriptsPoweShell\manage_user.cjs",
    "c:\Users\asm\Desktop\lvasquez-2025014--BIM4\backend\scripts\manage_user.cjs"
)

$runnerScript = $null
foreach ($p in $possiblePaths) {
    if (Test-Path $p) {
        $runnerScript = (Resolve-Path $p).Path
        break
    }
}

if (-not $runnerScript) {
    Write-Host "`n[ERROR] No se encontro manage_user.cjs en ninguna de las rutas conocidas." -ForegroundColor Red
    exit
}

Write-Host "`nAsignando rol ADMIN a '$identificador' en MongoDB..." -ForegroundColor Yellow

try {
    $out = & node $runnerScript promote $identificador
    $res = $out | ConvertFrom-Json

    if ($res.success) {
        Write-Host "`n[EXITO] El usuario '$identificador' ahora es ADMINISTRADOR (rol: $($res.rol))." -ForegroundColor Green
        Write-Host "Cuando inicie sesion con Google o contrasena, tendra acceso total como Administrador." -ForegroundColor Green
    } else {
        Write-Host "`n[ERROR] $($res.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "`n[ERROR] Ocurrio un error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`nPresiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
