# ==============================================================================
# Script: Crear-Usuario-Cliente.ps1
# Rol Asignado: user (Cliente estándar)
# Registra directamente en MongoDB sin requerir credenciales previas ni login HTTP
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   CREAR USUARIO CLIENTE (VOUGHT CONTROL DE GASTOS)       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$usuario = Read-Host "Ingresa el nombre de usuario (ej: cliente_juan)"
if (-not $usuario) { 
    Write-Host "`n[ERROR] El usuario es obligatorio." -ForegroundColor Red
    exit 
}

$nombre = Read-Host "Ingresa el nombre completo (ej: Juan Perez)"
if (-not $nombre) { $nombre = $usuario }

$password = Read-Host "Ingresa la contrasena para este cliente" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
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

Write-Host "`nRegistrando cliente en la base de datos MongoDB..." -ForegroundColor Cyan

try {
    $out = & node $runnerScript create $usuario $plainPassword $nombre user
    $res = $out | ConvertFrom-Json

    if ($res.success) {
        Write-Host "`n[EXITO] Usuario Cliente guardado satisfactoriamente en MongoDB:" -ForegroundColor Green
        Write-Host "  - ID: $($res.id)"
        Write-Host "  - Usuario: $($res.usuario)"
        Write-Host "  - Nombre: $($res.nombre)"
        Write-Host "  - Rol: $($res.rol) (Cliente)"
        Write-Host "`nYa puede iniciar sesion en la aplicacion normalmente." -ForegroundColor Green
    } else {
        Write-Host "`n[ERROR] No se pudo crear el usuario: $($res.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "`n[ERROR] Ocurrio una excepcion al ejecutar el script:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`nPresiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
