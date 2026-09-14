# ==============================================================================
# Script: Cambiar-Password-Admin.ps1
# Permite cambiar la contraseña de cualquier usuario administrador en MongoDB
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   VOUGHT SECURITY // CAMBIO DE CONTRASEÑA DE USUARIO     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$usuario = Read-Host "Ingresa el nombre de usuario (por defecto: admin)"
if (-not $usuario) { $usuario = "admin" }

$newPassword = Read-Host "Ingresa la NUEVA contrasena para el usuario '$usuario'" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($newPassword)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)

if (-not $plainPassword) {
    Write-Host "`n[ERROR] La contrasena no puede estar vacia." -ForegroundColor Red
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

Write-Host "`nActualizando credenciales del usuario '$usuario' en MongoDB..." -ForegroundColor Yellow

try {
    $out = & node $runnerScript change-password $usuario $plainPassword
    $res = $out | ConvertFrom-Json

    if ($res.success) {
        Write-Host "`n[EXITO] La contrasena de '$usuario' fue actualizada con exito en MongoDB." -ForegroundColor Green
        Write-Host "Ya puedes iniciar sesion con tu nueva contrasena." -ForegroundColor Green
    } else {
        Write-Host "`n[ERROR] $($res.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "`n[ERROR] Ocurrio un error al actualizar:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`nPresiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
