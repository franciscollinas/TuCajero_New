# BUILD_CONTEXT

## Estado del build

Estado actual validado en esta sesion:

- `npm run build:electron` -> OK
- `npm run clean:template` -> OK
- `npm run dist` -> OK

Salida generada:

- `release\TuCajero Setup 1.0.0.exe`
- `release\TuCajero 1.0.0.exe`
- `release\win-unpacked\TuCajero.exe`

## Problema pendiente

El paquete se construye correctamente, pero el ejecutable empaquetado:

`release\win-unpacked\TuCajero.exe`

sale rapidamente con `ExitCode 0`.

Eso significa que el problema pendiente ya no es:

- falta de Prisma engine
- falta de renderer empaquetado
- falta de plantilla DB

Es mas probable:

- cierre temprano del proceso Electron
- problema de bootstrap
- fallo de carga de ventana/renderer sin crash duro

## Confirmaciones tecnicas ya hechas

### Dentro de `app.asar`

Existen:

- `\package.json`
- `\dist\main\app\main\main.js`
- `\dist\renderer\index.html`
- `\database\tucajero.db`

### Dentro de `app.asar.unpacked`

Existe:

- `query_engine-windows.dll.node`

## Cambios de build que no deben revertirse

- [build/installer.nsh](/c:/Users/UserMaster/Documents/MPointOfSale/build/installer.nsh:1) ya no toca DB/config/logs dentro de `$INSTDIR`
- [scripts/clean-template.ts](/c:/Users/UserMaster/Documents/MPointOfSale/scripts/clean-template.ts:1) ya no falla silenciosamente con tablas faltantes
- [app/main/utils/paths.ts](/c:/Users/UserMaster/Documents/MPointOfSale/app/main/utils/paths.ts:1) centraliza rutas

## Diagnostico ya preparado

`main.ts` ahora escribe una traza muy temprana en:

`%TEMP%\tucajero-boot.log`

Ademas loggea:

- init de DB
- carga del renderer
- `did-fail-load`
- `render-process-gone`
- `child-process-gone`
- excepciones no atrapadas

## Proximo paso exacto para quien continue

1. Ejecutar:

```powershell
npm run dist
```

2. Lanzar:

```powershell
release\win-unpacked\TuCajero.exe
```

3. Revisar:

```powershell
Get-Content "$env:TEMP\tucajero-boot.log"
```

4. Si no existe esa traza:

- investigar bootstrap antes del `main.js`

5. Si existe:

- seguir el ultimo evento y arreglar ese punto exacto

## Incidente de sesion que NO se debe repetir

Se sobrescribio accidentalmente el `package.json` raiz del repo al extraer `app.asar`.
Ya fue restaurado.

No extraer `app.asar` encima del workspace raiz.
