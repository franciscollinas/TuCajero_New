@echo off
echo ====================================================
echo EMPAQUETADO DE TUCAJERO POS
echo ====================================================

echo.
echo [1/4] Generando cliente Prisma...
call npm run db:generate

echo.
echo [2/4] Reconstruyendo drivers de base de datos para Electron...
call npm run rebuild

echo.
echo [3/4] Cerrando todas las instancias de la aplicacion y limpiando carpetas de versiones anteriores...
taskkill /F /IM TuCajero.exe /T >nul 2>&1
taskkill /F /IM tucajero.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

rmdir /S /Q dist release release-build >nul 2>&1

echo.
echo [4/4] Empezando la compilacion final (esto tomara un momento)...
call npm run dist

echo.
echo ====================================================
echo PROCESO FINALIZADO.
echo Revisa la carpeta "release" para encontrar el instalador.
echo ====================================================
pause
