# CONTEXTO_SESION

> Ultima actualizacion: 21 de abril de 2026
> Objetivo actual: estabilizar instalacion, runtime empaquetado y rutas de datos

## 1. Estado real del proyecto

El problema principal ya no es la UI. El problema real ha sido la mezcla de:

- rutas de desarrollo
- rutas de instalacion
- datos mutables escritos dentro de `Program Files` o `resources`
- scripts de build que fallaban o escondian fallos

La prioridad de esta fase fue dejar una sola logica coherente para:

- base de datos
- licencia
- impresora
- backups
- logs
- reportes
- instalador

## 2. Cambios ya aplicados y que NO se deben revertir

### Rutas centralizadas

Se creo [app/main/utils/paths.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/utils/paths.ts:1).

Ese archivo es ahora la fuente de verdad para:

- `.env`
- ruta de DB
- plantilla de DB
- engine path de Prisma
- logs
- backups
- impresora
- facturas temporales
- licencia
- downloads
- reportes

### Main process saneado

Se reescribio [app/main/main.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/main.ts:1) para:

- cargar `.env` desde un helper
- fijar `DATABASE_URL` de forma coherente
- validar DB empaquetada antes de iniciar
- respaldar DB incompatible con sufijo `.bak`
- copiar plantilla si la DB empaquetada no existe o tiene schema incompleto
- agregar diagnostico de proceso principal

### Prisma saneado

Se reescribio [app/main/repositories/prisma.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/repositories/prisma.ts:1) para usar `paths.ts`.

### Impresora corregida

Se movio configuracion y temporales de impresora fuera de `Program Files`:

- [app/main/services/printer.service.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/services/printer.service.ts:1)
- [app/main/ipc/printer.ipc.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/ipc/printer.ipc.ts:1)

### Backup corregido

[app/main/services/backup.service.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/services/backup.service.ts:1) ya no usa rutas hardcodeadas del PC del desarrollador.

### Instalador corregido

[build/installer.nsh](/c:/Users/UserMaster/Documents/MPointOfSale/build/installer.nsh:1) ya NO:

- crea carpetas mutables en `$INSTDIR`
- escribe `.env`
- fuerza `DATABASE_URL` hacia `resources\app\database`

### Script de plantilla corregido

[scripts/clean-template.ts](/c:/Users/UserMaster/Documents/MPointOfSale/scripts/clean-template.ts:1) ya no falla en silencio con tablas faltantes.

## 3. Verificaciones ya hechas

Estos comandos ya pasaron varias veces durante esta sesion:

- `npm run build:electron`
- `npm run clean:template`
- `npm run dist`

El instalador y el portable se generaron en:

- `release\TuCajero Setup 1.0.0.exe`
- `release\TuCajero 1.0.0.exe`
- `release\win-unpacked\TuCajero.exe`

Tambien se verifico que `app.asar` incluye:

- `dist/main/app/main/main.js`
- `dist/renderer/index.html`
- `database/tucajero.db`
- `query_engine-windows.dll.node` en `app.asar.unpacked`

## 4. Problema actual exacto

El ejecutable empaquetado:

- `release\win-unpacked\TuCajero.exe`

esta cerrando rapido con `ExitCode 0`.

Eso significa:

- no parece crash duro de Prisma ni de DLL faltante
- no parece error clasico de permisos
- probablemente es bootstrap temprano de Electron, carga del renderer o cierre limpio antes de que la app quede visible

## 5. Diagnostico ya agregado para continuar

En [app/main/main.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/main.ts:1) se agrego:

- `uncaughtException`
- `unhandledRejection`
- `did-fail-load`
- `render-process-gone`
- `child-process-gone`
- logs de carga de ventana
- logs de init DB
- `bootTrace()` escribiendo en:

`%TEMP%\tucajero-boot.log`

### Hipotesis actual

Si al lanzar el exe empaquetado NO aparece o no cambia `%TEMP%\tucajero-boot.log`, entonces el problema ocurre antes de ejecutar nuestro `main.js`.

Si SI aparece, esa traza debe decir en que punto exacto sale.

## 6. Siguiente paso exacto para OpenCode

1. Verificar que `package.json` del repo siga correcto.
   Nota: durante esta sesion, al extraer `app.asar`, se sobrescribio accidentalmente el `package.json` raiz con el del paquete. Ya fue restaurado.

2. Ejecutar:

```powershell
npm run dist
```

3. Lanzar:

```powershell
release\win-unpacked\TuCajero.exe
```

4. Revisar:

```powershell
Get-Content "$env:TEMP\tucajero-boot.log"
```

5. Tomar decision:

- Si no existe traza: investigar bootstrap de Electron, entrypoint empaquetado y lanzamiento del binario.
- Si existe traza: seguir el ultimo evento y corregir esa salida temprana.

## 7. Reglas para OpenCode

- No revertir `paths.ts`, `main.ts`, `prisma.ts`, `installer.nsh`, `printer.service.ts`, `backup.service.ts`.
- No volver a meter logica de DB/config dentro del instalador.
- No hardcodear rutas de `C:\Users\UserMaster\...`
- No tocar features de UI antes de cerrar el problema del runtime empaquetado.
- No extraer `app.asar` encima del workspace raiz otra vez.

## 8. Archivos mas importantes ahora

- [app/main/main.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/main.ts:1)
- [app/main/utils/paths.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/utils/paths.ts:1)
- [app/main/repositories/prisma.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/repositories/prisma.ts:1)
- [build/installer.nsh](/c:/Users/UserMaster/Documents/MPointOfSale/build/installer.nsh:1)
- [package.json](/c:/Users/UserMaster/Documents/MPointOfSale/package.json:1)

## 9. Comando de busqueda util

```powershell
rg -n "app\.getPath\(|process\.cwd\(|process\.resourcesPath|app\.getAppPath\(" app\main -S
```

Lo esperado es que casi todo quede concentrado en `paths.ts`.
