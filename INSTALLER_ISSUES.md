# Problemas con el Instalador de TuCajero

## Problema Principal

El instalador NSIS se genera correctamente pero la aplicación no funciona porque no puede encontrar los módulos nativos de Prisma y better-sqlite3.

### Error Específico

```
Error: Cannot find module '.prisma/client/default'
Require stack:
- node_modules/.prisma/client/default.js
- node_modules/@prisma/client/index.js
- dist/main/app/main/main.js
```

## Causa Raíz

Electron-builder excluye por defecto carpetas que comienzan con `.` (como `.prisma`) y archivos nativos (`.node`, `.dll`). Aunque en la configuración se especifica `asar: false`, electron-builder igual aplica filtros de exclusión por defecto.

## Cambios Realizados en electron-builder.yml

### 1. Configuración Inicial (PROBLEM)

El archivo tenía código JavaScript en lugar de YAML válido:

```javascript
// INCORRECTO - era un archivo .yml con contenido JS
module.exports = { ... }
```

### 2. Primera Corrección

Se convirtió a formato YAML válido.

### 3. Segunda Corrección

Se intentó incluir `.prisma` explícitamente:

```yaml
files:
  - node_modules/.prisma/**/*
  - node_modules/@prisma/client/**/*
```

### 4. Tercera Corrección

Se habilitó ASAR con asarUnpack:

```yaml
asar: true
asarUnpack:
  - 'node_modules/.prisma/**/*'
  - 'node_modules/better-sqlite3/**/*'
```

**Resultado**: No funcionó - los patrones de asarUnpack no reconocieron las carpetas con punto.

### 5. Cuarta Corrección

Se intentó usar patrón negated para forzar inclusión:

```yaml
files:
  - '!**/node_modules/.prisma/**/*'
  - 'node_modules/.prisma/**/*'
```

**Resultado**: No funcionó.

### 6. Quinta Corrección

Se intentó copiar `.prisma` a una carpeta sin punto (`prisma-client`) antes del build:

```json
"prebuild": "node -e \"const fs=require('fs');const src='node_modules/.prisma',dst='node_modules/prisma-client';if(fs.existsSync(src)&&!fs.existsSync(dst))fs.cpSync(src,dst,{recursive:true})\""
```

**Resultado**: El folder se crea pero electron-builder igualmente lo excluye.

### 7. Se第六次Corrección (Intentando)

Se puso `node_modules/.prisma` al inicio de la lista de files:

```yaml
files:
  - node_modules/.prisma
  - dist/**/*
  - package.json
  - node_modules/**/*
```

## Soluciones Intentadas

| #   | Solución                      | Resultado                      |
| --- | ----------------------------- | ------------------------------ |
| 1   | YAML válido con `asar: false` | Build OK, pero falta `.prisma` |
| 2   | `asar: true` con `asarUnpack` | No reconoce patrones con punto |
| 3   | Patrones negated              | No funciona                    |
| 4   | Copiar a carpeta sin punto    | También se excluye             |
| 5   | Poner `.prisma` al inicio     | Pendiente                      |

## Estado Actual

- El instalador se genera: `release-build/TuCajero Setup 1.0.0.exe` (~129 MB)
- El exe dentro de `release-build/win-unpacked/` funciona si se ejecutanpm start en el directorio
- Pero al instalar, faltan los módulos nativos

## Siguiente Paso Sugerido

1. Intentar poner `node_modules/.prisma` al inicio de files (ya configurado)
2. Si no funciona, usar electron-builder en modo portable (sin NSIS) para probar
3. Considerar usar un bundler como electron-vite que maneja native modules mejor

## Archivos Modificados

- `electron-builder.yml` - Configuración del build
- `package.json` - Scripts de build (agregado prebuild)
- `database/schema.prisma` - Temporalmente modificado (revertido)
