# TuCajero New

POS desktop offline-first para farmacias, construido con Electron, React, TypeScript, Prisma y SQLite.

## Resumen

TuCajero New es una aplicación de punto de venta orientada a operación local en Windows. El proyecto está diseñado para trabajar sin depender de un backend remoto y prioriza:

- operación offline
- control de caja
- inventario con alertas
- ventas con pagos mixtos
- facturación PDF
- auditoría interna
- administración por roles

## Stack

### Desktop

- Electron 30+
- Node.js 20+

### Frontend

- React 18
- TypeScript 5
- Vite 5
- React Router 6
- Zustand

### Backend local

- Prisma 5
- SQLite
- Winston

### Importación y exportación

- PapaParse
- xlsx
- pdfkit

### Integraciones previstas

- escáner de código de barras tipo HID
- impresora térmica vía `node-thermal-printer`
- licencia por hardware con `systeminformation`

## Estado del proyecto

### Implementado

- setup completo de Electron + React + TypeScript + Prisma
- autenticación local y sesiones
- apertura y cierre de caja
- inventario con:
  - categorías
  - stock
  - alertas
  - vencimientos
  - importación CSV/Excel
- ventas con:
  - carrito
  - pagos mixtos
  - historial
  - generación de factura PDF
- auditoría persistente
- administración básica de usuarios

### Pendiente

- reportes y exportación administrativa
- backup / restore
- licencia por hardware
- integración de escáner HID
- integración de impresora térmica
- pulido visual y UX final

## Arquitectura

La comunicación sigue este patrón:

`Renderer -> API wrapper -> IPC handler -> Service -> Prisma/SQLite`

### Estructura principal

```text
app/
  main/
    ipc/
    repositories/
    services/
    utils/
    main.ts
    preload.ts
  renderer/src/
    modules/
    shared/
database/
  schema.prisma
  migrations/
config/
  i18n/es.ts
scripts/
```

## Módulos actuales

### Auth

- login
- logout
- validación de sesión
- roles base

Admin por defecto:

- usuario: `admin`
- contraseña: `admin123`

### Cash Session

- apertura de caja
- cierre de caja
- estado de caja activa
- actualización de efectivo esperado por ventas

### Inventory

- productos y categorías
- búsqueda por barcode
- stock mínimo y crítico
- alertas de stock
- alertas de vencimiento
- importación masiva

### Sales

- POS
- carrito
- pagos mixtos
- cálculo de IVA
- control de stock
- historial de ventas
- cancelación de ventas
- PDF de factura

### Audit

Se registran acciones relevantes como:

- `auth:login`
- `auth:logout`
- `cash-session:opened`
- `cash-session:closed`
- `product:created`
- `product:stock-adjusted`
- `product:bulk-imported`
- `sale:created`
- `sale:cancelled`
- `user:created`
- `user:edited`

### Users

- listado de usuarios
- creación
- edición
- activación/desactivación

## Base de datos

El esquema principal está en:

- `database/schema.prisma`

Migraciones actuales ya aplicadas:

- fundación inicial
- auth/caja
- inventario
- ventas

## Arranque local

### Requisitos

- Node.js 20+
- npm
- Windows

### Instalación

```powershell
npm install
```

### Desarrollo

```powershell
npm run dev
```

### Compilación

```powershell
npm run build
```

### Validaciones útiles

```powershell
npx tsc --noEmit
npx tsc -p tsconfig.main.json --noEmit
npm run lint
npx prisma migrate status --schema database/schema.prisma
```

## Notas de desarrollo

### IPC tipado

Todos los handlers deben responder con:

```ts
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```

### Textos visibles

Todo texto visible al usuario debe vivir en:

- `config/i18n/es.ts`

### Acceso a base de datos

El renderer no accede directamente a Prisma ni a SQLite.

Siempre se usa:

- wrapper API en renderer
- IPC en main
- service
- Prisma

## Archivos clave

### Core

- `app/main/main.ts`
- `app/main/preload.ts`
- `app/main/utils/logger.ts`
- `app/main/utils/errors.ts`

### Services

- `app/main/services/auth.service.ts`
- `app/main/services/cash-session.service.ts`
- `app/main/services/inventory.service.ts`
- `app/main/services/sales.service.ts`
- `app/main/services/invoice.service.ts`
- `app/main/services/audit.service.ts`
- `app/main/services/users.service.ts`

### UI

- `app/renderer/src/App.tsx`
- `app/renderer/src/modules/dashboard/DashboardPage.tsx`
- `app/renderer/src/modules/inventory/InventoryPage.tsx`
- `app/renderer/src/modules/inventory/InventoryBulkImportPage.tsx`
- `app/renderer/src/modules/sales/POSPage.tsx`
- `app/renderer/src/modules/sales/SalesHistoryPage.tsx`
- `app/renderer/src/modules/audit/AuditPage.tsx`
- `app/renderer/src/modules/users/UsersPage.tsx`

## Hoja de ruta inmediata

La referencia principal actual es:

- `MasterDoc.md`

Prioridad recomendada para continuar:

1. reportes y exportación
2. backup / restore
3. licencia por hardware
4. scanner HID
5. impresora térmica
6. refinamiento visual completo

## Publicación

El repositorio está preparado para subirse como:

- `TuCajero New`

Si la máquina no tiene `gh` instalado, se puede crear el repo manualmente en GitHub y luego:

```powershell
git remote add origin <URL_DEL_REPO>
git push -u origin main
```

## Licencia

Pendiente de definir.
