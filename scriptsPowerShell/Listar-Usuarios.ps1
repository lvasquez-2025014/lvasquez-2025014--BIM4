# ==============================================================================
# Script: Listar-Usuarios.ps1
# Consulta todos los usuarios registrados en MongoDB directamente
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   LISTA DE USUARIOS REGISTRADOS (VOUGHT CONTROL DE GASTOS)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

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

try {
    $out = & node $runnerScript list
    $res = $out | ConvertFrom-Json

    if ($res.success) {
        Write-Host "`nTotal de usuarios registrados en MongoDB: $($res.count)" -ForegroundColor Cyan
        if ($res.count -gt 0) {
            $res.users | Format-Table id, usuario, nombre, rol, createdAt -AutoSize
        } else {
            Write-Host "No hay usuarios registrados aun en la base de datos." -ForegroundColor Yellow
        }
    } else {
        Write-Host "`n[ERROR] No se pudo obtener la lista: $($res.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "`n[ERROR] Ocurrio una excepcion:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`nPresiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
