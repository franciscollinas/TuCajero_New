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
- generación de factura HTML (abre automáticamente en navegador)
- recibo térmico ESC/POS (contenido generado)

### Escáner HID

- `useBarcodeScanner.ts` hook — detecta escaneo por teclado HID
- acumula keystrokes globales, ignora inputs manuales
- dispara al detectar Enter tras ráfaga rápida (< 60ms entre teclas)
- integrado en POSPage: escanear → agrega al carrito automáticamente

### Alertas centralizadas

- `alert.service.ts` (main) — stock crítico/bajo + vencimiento (expired/critical/warning)
- `alerts.ipc.ts` + `alert.api.ts` + `alert.types.ts`
- `useAlerts` hook + `useAlertStore` (Zustand)
- `/alerts` — página con resumen por severidad y tabla detallada

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

### Reportes y exportación

- `reports.service.ts` — consolidación de ventas, cortes de caja, inventario, vencimientos, auditoría
- exportación CSV/XLSX en `Descargas/TuCajero-reportes`
- `reports.ipc.ts` + `reports.api.ts`
- pantalla `/reports` con filtro por fechas, tablas resumen y botones de exportación

### Backup / Restore

- `backup.service.ts` — crea, lista, elimina y restaura copias de la BD SQLite
- validación de integridad (header SQLite format 3)
- pre-restore backup automático con reversión si falla
- `backup.ipc.ts` + `backup.api.ts` + `backup.types.ts`
- pantalla `/backup` con info de BD, crear backup, tabla de backups con restaurar/eliminar
- acciones registradas en auditoría

### Licencia por hardware

- `fingerprint.ts` — SHA-256 de CPU + disco + MAC + hostname
- `license.service.ts` — genera, activa y valida licencia con HMAC-SHA256
- persistencia en `userData/license.dat`
- `license.ipc.ts` + `license.api.ts` + `license.types.ts`
- pantalla `/license` — estado, fingerprint, activar, generar nueva licencia
- `LicenseLockScreen` exportado para pantalla de bloqueo
- RBAC: solo ADMIN

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
- ventas (con factura HTML + recibo térmico ESC/POS)
- escáner HID
- alertas centralizadas
- auditoría
- usuarios admin
- reportes y exportación
- backup / restore
- licencia por hardware
- parte de RBAC en UI

### Siguiente bloque recomendado

1. Impresora térmica (hardware real — node-thermal-printer)
2. Pulido UI/UX final
3. Empaquetado instalador

## Recomendación para mañana

Retomar por **impresora térmica real** (conectar `node-thermal-printer` a una impresora física USB/red) y luego pasar al **pulido UI/UX final** + empaquetado instalador.

## Archivos clave para entender rápido el proyecto

### Backend

- `app/main/main.ts`
- `app/main/preload.ts`
- `app/main/utils/errors.ts`
- `app/main/utils/logger.ts`
- `app/main/utils/fingerprint.ts`
- `app/main/services/auth.service.ts`
- `app/main/services/alert.service.ts`
- `app/main/services/audit.service.ts`
- `app/main/services/backup.service.ts`
- `app/main/services/cash-session.service.ts`
- `app/main/services/inventory.service.ts`
- `app/main/services/license.service.ts`
- `app/main/services/printer.service.ts`
- `app/main/services/reports.service.ts`
- `app/main/services/sales.service.ts`
- `app/main/services/users.service.ts`

### IPC

- `app/main/ipc/alerts.ipc.ts`
- `app/main/ipc/auth.ipc.ts`
- `app/main/ipc/audit.ipc.ts`
- `app/main/ipc/backup.ipc.ts`
- `app/main/ipc/cash-session.ipc.ts`
- `app/main/ipc/inventory.ipc.ts`
- `app/main/ipc/license.ipc.ts`
- `app/main/ipc/ping.ipc.ts`
- `app/main/ipc/printer.ipc.ts`
- `app/main/ipc/reports.ipc.ts`
- `app/main/ipc/sales.ipc.ts`
- `app/main/ipc/users.ipc.ts`

### Frontend

- `app/renderer/src/App.tsx`
- `app/renderer/src/shared/context/AuthContext.tsx`
- `app/renderer/src/shared/hooks/useAlerts.ts`
- `app/renderer/src/shared/hooks/useBarcodeScanner.ts`
- `app/renderer/src/shared/hooks/useRBAC.ts`
- `app/renderer/src/shared/store/alert.store.ts`
- `app/renderer/src/shared/api/alert.api.ts`
- `app/renderer/src/shared/api/backup.api.ts`
- `app/renderer/src/shared/api/license.api.ts`
- `app/renderer/src/shared/api/printer.api.ts`
- `app/renderer/src/shared/api/reports.api.ts`
- `app/renderer/src/modules/alerts/AlertsPage.tsx`
- `app/renderer/src/modules/audit/AuditPage.tsx`
- `app/renderer/src/modules/backup/BackupPage.tsx`
- `app/renderer/src/modules/dashboard/DashboardPage.tsx`
- `app/renderer/src/modules/inventory/InventoryPage.tsx`
- `app/renderer/src/modules/inventory/InventoryBulkImportPage.tsx`
- `app/renderer/src/modules/license/LicensePage.tsx`
- `app/renderer/src/modules/reports/ReportsPage.tsx`
- `app/renderer/src/modules/sales/POSPage.tsx`
- `app/renderer/src/modules/sales/SalesHistoryPage.tsx`
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
