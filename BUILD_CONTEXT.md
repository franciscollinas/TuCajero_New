# Contexto del Proyecto TuCajero POS

## Estado Actual

- **Commit actual**: `d6809b4` - "arreglos finales OK"
- **Rama**: main
- **Último push**: a origin/main

## Objetivo

Generar el instalador (NSIS) para distribución en PCs de bajos recursos.

## Problema Actual

El build falla con error:

```
Error: remove ...\dist\win-unpacked\resources\app.asar: El proceso no tiene acceso al archivo porque está siendo utilizado por otro proceso.
```

El archivo `app.asar` está bloqueado por un proceso de Electron.

## Cambios Realizados Recientemente

### 1. electron-builder.config.js

- Cambiado `output` de `release` a `release-build` (para evitar conflicto)
- Configuración optimizada para PCs de bajos recursos:
  - `compression: 'store'` (más rápido que 'maximum')
  - `asar.unpackDir` para node_modules/sharp
  - NSIS con `compression: 'lzma'`
- Agregado icono desde `build/icon.ico`

### 2. Limpieza de archivos

- Eliminada carpeta `tailadmin-free-tailwind-dashboard-template-main/` (~600KB)
- Eliminados archivos no utilizados del build

### 3. Migración V1

- Agregada ruta de base de datos V1:
  ```
  C:\Users\UserMaster\Documents\Proyectos\TuCajeroPOS\tucajero\tucajero.db
  ```

### 4. UI/UX

- AboutModal integrado en Layout.tsx
- Botón de "Acerca de" junto al botón de logout
- Favicon agregado (icon.ico + isotipo.png en public/)
- index.html actualizado con ambos favicons

## Archivos Modificados

```
app/main/services/backup.service.ts     - Agregada ruta V1
app/renderer/index.html                - Favicon agregado
app/renderer/src/shared/components/Layout.tsx - AboutModal integrado
build/icon.ico                         - Creado desde isotipo.png
electron-builder.config.js             - Optimizado para PCs de bajos recursos
```

## Comandos para Build

```bash
# Build completo (frontend + electron + installer)
npm run dist

# Solo build (sin installer)
npm run build

# Build solo renderer (React/Vite)
npm run build:renderer

# Build solo electron (TypeScript)
npm run build:electron
```

## Notas Importantes

1. **Ejecutar `npm run dist` después de reiniciar** el PC para evitar el archivo bloqueado
2. El build genera el instalador en `release-build/` (no en `release/`)
3. El instalador NSIS pesará ~150MB (Electron runtime + app)
4. Para PCs de bajos recursos, el código ya tiene optimizaciones:
   - Lazy loading de chunks (PDF, Excel)
   - Terser con drop_console y drop_debugger
   - Code splitting por vendor

## Pendiente

- [ ] Ejecutar build después de reiniciar PC
- [ ] Verificar que el instalador se genera correctamente
- [ ] Probar el exe en PC de bajos recursos
