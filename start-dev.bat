@echo off
cd /d "%~dp0"

REM Limpiar variables conflictivas
set ELECTRON_RUN_AS_NODE=
set NODE_ENV=development

REM Compilar el proceso principal
echo [1/3] Compilando TypeScript...
call npx tsc -p tsconfig.main.json --noEmit false >nul 2>&1
if errorlevel 1 (
    echo ERROR: Fallo en compilacion TypeScript
    pause
    exit /b 1
)
echo [OK] Compilacion exitosa

REM Iniciar Vite (renderer) en segundo plano
echo [2/3] Iniciando servidor Vite...
start "Vite-Renderer" /min cmd /c "npx vite app/renderer --port 5173"
timeout /t 5 /nobreak > nul
echo [OK] Vite iniciado

REM Lanzar Electron detached (no muere al cerrar terminal)
echo [3/3] Lanzando TuCajero POS...
start "TuCajero POS" "node_modules\electron\dist\electron.exe" "dist/main/app/main/main.js"

echo.
echo ========================================
echo   TuCajero POS se ha lanzado
echo   Busca la ventana en la barra de tareas
echo   o presiona Alt+Tab
echo ========================================
echo.
echo Usuario: admin
echo Contrasena: (la que mostr o la que configuraste)
echo.
