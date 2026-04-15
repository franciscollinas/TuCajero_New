@echo off
echo.
echo ========================================
echo   RESETEANDO BASE DE DATOS
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Eliminando base de datos actual...
if exist "database\tucajero.db" (
    del "database\tucajero.db"
    echo Base de datos eliminada.
) else (
    echo No se encontro base de datos, continuando...
)
echo.

echo [2/4] Ejecutando migraciones de Prisma...
npx prisma migrate deploy --schema=database\schema.prisma
if errorlevel 1 (
    echo ERROR: Fallaron las migraciones!
    pause
    exit /b 1
)
echo.

echo [3/4] Ejecutando seed de datos iniciales...
npx tsx scripts\seed-runner.ts
if errorlevel 1 (
    echo ERROR: Fallo el seed!
    pause
    exit /b 1
)
echo.

echo [4/4] Verificando base de datos...
npx prisma db execute --schema=database\schema.prisma --stdin < NUL
echo.

echo ========================================
echo   BASE DE DATOS RESETEADA EXITOSAMENTE
echo ========================================
echo.
echo La app esta lista para usar como si estuviera recien instalada.
echo.
pause
