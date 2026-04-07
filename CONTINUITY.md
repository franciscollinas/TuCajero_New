# TuCajero New - Guía de Continuidad

## Estado actual

Proyecto desktop POS para farmacias construido con:

- Electron
- React + TypeScript + Vite
- Prisma + SQLite
- IPC tipado con `ApiResponse<T>`

La base funcional ya está bastante avanzada. El proyecto compila y arranca.

Checks validados en la última sesión:

- `npx tsc --noEmit`
- `npx tsc -p tsconfig.main.json --noEmit`
- `npm run lint`
- `npm run build`

## Lo que ya está implementado

### Fundación

- setup Electron/React/TypeScript/Vite
- preload seguro con `window.api.invoke`
- logger a archivo
- i18n central en `config/i18n/es.ts`
- errores centralizados
- Prisma + migraciones

### Autenticación y caja

- login/logout
- validación de sesión
- seed de admin por defecto
- apertura/cierre de caja
- persistencia de sesiones

Credenciales actuales de admin:

- usuario: `admin`
- contraseña: `admin123`

### Inventario

- categorías
- productos
- búsqueda por barcode
- ajuste de stock
- alertas de stock
- alertas de vencimiento
- importación CSV/Excel
- UI de inventario

### Ventas

- POS con carrito
- pagos mixtos
- validación de stock y vencimiento
- descuento automático de inventario
- actualización de `expectedCash`
- historial de ventas
- generación de factura PDF

### Auditoría

- logs persistentes de:
  - login/logout
  - apertura/cierre de caja
  - creación/ajuste/importación de inventario
  - creación/cancelación de ventas
  - creación/edición de usuarios
- pantalla admin de auditoría

### Usuarios

- listado admin
- creación de usuarios
- edición de nombre/rol/password
- activar/desactivar usuario

## Problemas ya resueltos

### Arranque roto de Electron

Se corrigió un problema con `ELECTRON_RUN_AS_NODE=1` y otro con `EPIPE`.

Archivos clave:

- `scripts/dev-electron.cjs`
- `app/main/main.ts`

Regla actual:

- usar `npm run dev`
- o `npm run dev:electron` + `npm run dev:renderer` si se quiere separar

### Compatibilidad Prisma + SQLite

Hubo que adaptar partes del esquema porque el material original mezclaba SQLite con restricciones no compatibles en Prisma.

## Punto exacto donde retomar

Se estaba siguiendo `MasterDoc.md` como guía principal, no solo `Fase1-4.md`.

### Ya cubierto del MasterDoc

- fundación
- núcleo operativo principal
- ventas
- auditoría
- usuarios admin
- parte de RBAC en UI

### Siguiente bloque recomendado

1. Reportes y exportación
2. Backup / Restore
3. Licencia por hardware
4. Escáner HID
5. Impresora térmica
6. Pulido UI/UX final

## Recomendación para mañana

Retomar por reportes/exportación porque:

- ya existe suficiente data útil: ventas, caja, inventario, auditoría
- encaja con `MasterDoc`
- desbloquea administración casi completa

### Orden sugerido

1. crear `reports.service.ts`
2. crear `reports.ipc.ts`
3. exponer API tipada en renderer
4. construir pantalla admin de reportes
5. exportar a CSV/XLSX
6. agregar enlaces en dashboard

## Archivos clave para entender rápido el proyecto

### Backend

- `app/main/main.ts`
- `app/main/preload.ts`
- `app/main/utils/errors.ts`
- `app/main/utils/logger.ts`
- `app/main/services/auth.service.ts`
- `app/main/services/cash-session.service.ts`
- `app/main/services/inventory.service.ts`
- `app/main/services/sales.service.ts`
- `app/main/services/invoice.service.ts`
- `app/main/services/audit.service.ts`
- `app/main/services/users.service.ts`

### IPC

- `app/main/ipc/auth.ipc.ts`
- `app/main/ipc/cash-session.ipc.ts`
- `app/main/ipc/inventory.ipc.ts`
- `app/main/ipc/sales.ipc.ts`
- `app/main/ipc/audit.ipc.ts`
- `app/main/ipc/users.ipc.ts`

### Frontend

- `app/renderer/src/App.tsx`
- `app/renderer/src/shared/context/AuthContext.tsx`
- `app/renderer/src/shared/hooks/useRBAC.ts`
- `app/renderer/src/modules/dashboard/DashboardPage.tsx`
- `app/renderer/src/modules/inventory/InventoryPage.tsx`
- `app/renderer/src/modules/inventory/InventoryBulkImportPage.tsx`
- `app/renderer/src/modules/sales/POSPage.tsx`
- `app/renderer/src/modules/sales/SalesHistoryPage.tsx`
- `app/renderer/src/modules/audit/AuditPage.tsx`
- `app/renderer/src/modules/users/UsersPage.tsx`

### Base de datos

- `database/schema.prisma`
- `database/migrations/`

### Documentos guía

- `MasterDoc.md`
- `Fase1.md`
- `Fase2.md`
- `Fase3.md`
- `Fase4.md`

## Notas importantes

- la UI está funcional, pero todavía no está pulida visualmente
- primero conviene cerrar funcionalidad faltante
- después hacer una pasada fuerte de UX/UI
- `tmp-invoices/` contiene pruebas locales de factura y no debería publicarse

## Comandos útiles

```powershell
npm install
npm run dev
npx tsc --noEmit
npx tsc -p tsconfig.main.json --noEmit
npm run lint
npm run build
npx prisma migrate status --schema database/schema.prisma
```

## Objetivo al retomar

Cerrar funcionalidad restante del `MasterDoc`, dejar administración completa y luego entrar a pulido visual final.
