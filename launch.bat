@echo off
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
set NODE_ENV=development
echo Iniciando TuCajero...
start "" "node_modules\electron\dist\electron.exe" "dist/main/app/main/main.js"
