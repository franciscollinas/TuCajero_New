@echo off
echo.
echo  Ejecutando migracion con Electron (Node.js compatible)...
echo.
set ELECTRON_RUN_AS_NODE=1
node_modules\electron\dist\electron.exe scripts\migrate-from-v1.cjs %*
echo.
pause
