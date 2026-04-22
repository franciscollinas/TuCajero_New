# CONTINUITY

## Resumen ejecutivo

El proyecto ya paso por una fase fuerte de saneamiento de runtime e instalacion.
La siguiente IA no debe empezar “diagnosticando desde cero”. Debe partir de este estado:

- build genera instalador y portable
- rutas mutables ya no deben vivir en `Program Files`
- Prisma empaquetado ya incluye engine unpacked
- `app.asar` contiene renderer, main y plantilla DB
- el problema actual es salida temprana del exe empaquetado con codigo `0`

## Hechos confirmados

### Build y empaquetado

- `npm run build:electron` pasa
- `npm run dist` pasa
- se generan:
  - `release\TuCajero Setup 1.0.0.exe`
  - `release\TuCajero 1.0.0.exe`
  - `release\win-unpacked\TuCajero.exe`

### Contenido del paquete

Se verifico que `release\win-unpacked\resources\app.asar` contiene:

- `\package.json`
- `\dist\main\app\main\main.js`
- `\dist\renderer\index.html`
- `\database\tucajero.db`

Se verifico que existe:

- `release\win-unpacked\resources\app.asar.unpacked\dist\main\app\main\repositories\generated-client\query_engine-windows.dll.node`

## Cambios estructurales ya hechos

### No revertir

- [app/main/utils/paths.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/utils/paths.ts:1)
- [app/main/main.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/main.ts:1)
- [app/main/repositories/prisma.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/repositories/prisma.ts:1)
- [app/main/services/printer.service.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/services/printer.service.ts:1)
- [app/main/ipc/printer.ipc.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/ipc/printer.ipc.ts:1)
- [app/main/services/backup.service.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/services/backup.service.ts:1)
- [build/installer.nsh](/c:/Users/UserMaster/Documents/MPointOfSale/build/installer.nsh:1)
- [scripts/clean-template.ts](/c:/Users/UserMaster/Documents/MPointOfSale/scripts/clean-template.ts:1)

## Problema actual

Al lanzar:

```powershell
release\win-unpacked\TuCajero.exe
```

el proceso cierra rapido con `ExitCode 0`.

No se observo:

- crash visible
- carpeta `userData` clara creada
- logs normales de la app

## Instrumentacion agregada

Se agrego traza temprana en:

`%TEMP%\tucajero-boot.log`

Implementada en:

- [app/main/main.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/main.ts:1)

Tambien se agregaron logs de:

- uncaught exception
- unhandled rejection
- did-fail-load
- render-process-gone
- child-process-gone
- carga del renderer
- init de DB

## Proximo paso exacto

### Paso 1

Reconstruir con:

```powershell
npm run dist
```

### Paso 2

Lanzar:

```powershell
release\win-unpacked\TuCajero.exe
```

### Paso 3

Revisar inmediatamente:

```powershell
Get-Content "$env:TEMP\tucajero-boot.log"
```

### Interpretacion

- Si el archivo no existe o no cambia:
  - el problema esta antes de ejecutar nuestro `main.js`
  - investigar bootstrap de Electron, entrypoint empaquetado, firma o lanzamiento

- Si el archivo existe:
  - seguir el ultimo evento registrado
  - corregir esa salida temprana exacta

## Incidente importante ocurrido durante esta sesion

Al extraer `app.asar`, se sobrescribio accidentalmente el `package.json` raiz del repo con el `package.json` empaquetado.

Eso ya fue corregido.

### Leccion

No volver a usar `asar extract` apuntando al workspace raiz o a nombres de archivo que puedan pisar archivos reales del repo.

## Si OpenCode necesita inspeccionar package.json del asar

Debe extraer a una carpeta temporal dedicada, por ejemplo:

```powershell
Remove-Item -Recurse -Force tmp-asar -ErrorAction SilentlyContinue
npx asar extract release\win-unpacked\resources\app.asar tmp-asar
Get-Content tmp-asar\package.json
```

## Objetivo de la siguiente iteracion

No agregar features.
No rediseñar UI.
No tocar negocio.

Solo:

- aislar por que el exe empaquetado sale limpio demasiado pronto
- dejar trazabilidad clara
- corregir ese punto sin revertir el saneamiento ya hecho
