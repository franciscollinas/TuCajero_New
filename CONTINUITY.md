# TuCajero POS — Documento de Continuidad

> Última actualización: 8 de abril de 2026

---

## 1. Estado Actual del Proyecto

### 1.1 Rama y Commit
- **Rama activa:** `main`
- **Último commit:** `7a27e76` — *"refactor: integrar diseño TailAdmin en toda la UI"*
- **Commit estable anterior:** `cb11235` — *"primer push estable"*

### 1.2 Problema Principal
El commit `7a27e76` introdujo el sistema de diseño TailAdmin pero **rompió funcionalidades** en:
- **Dashboard** — perdió datos dinámicos (ventas del día, gráficas, etc.)
- **POS (Punto de Venta)** — perdió funcionalidad de escáner, factura, pagos mixtos, clientes
- **Estado de Caja** — diseño cambiado, perdió referencias al original

### 1.3 Qué Funciona Hoy
- ✅ Base de datos sincronizada (Prisma `db push` ejecutado)
- ✅ Cliente Prisma generado con campo `cashSessionId` en `Payment`
- ✅ Backend: `payDebt` recibe y guarda `cashSessionId`
- ✅ Backend: `getCashSessionSummary` suma ventas + abonos
- ✅ Backend: `getDashboardSummary` usa `Promise.all` (rendimiento optimizado)
- ✅ `CustomerDebtsModal` pasa `cashSessionId` al pagar deudas
- ✅ Estilo premium aplicado a `CustomerFormModal` y `CustomerHistoryModal`
- ✅ Filtro de fechas del dashboard corregido (zona horaria local)
- ✅ Errores de importación corregidos (`AuthContext`, `Payment`, `openInvoice`, `generateInvoice`)

### 1.4 Qué Está Roto
- ❌ **DashboardPage** — reemplazada por versión TailAdmin pero **perdió toda la lógica de datos** (no consume `getDashboardSummary`)
- ❌ **POSPage** — reemplazada por versión TailAdmin pero **perdió**: escáner de códigos, clientes, pagos múltiples, entrega de factura, botón "pago mixto", selección de cliente
- ❌ **CashRegisterPage** — reemplazada por versión TailAdmin, diseño cambiado

---

## 2. Archivos Originales Restaurables

Los archivos originales funcionales están en el commit `cb11235`:

```bash
# Para ver cualquier archivo original:
git show cb11235:app/renderer/src/modules/dashboard/DashboardPage.tsx
git show cb11235:app/renderer/src/modules/sales/POSPage.tsx
git show cb11235:app/renderer/src/modules/cash/CashRegisterPage.tsx
```

**Archivos originales clave:**
- `app/renderer/src/modules/dashboard/DashboardPage.tsx`
- `app/renderer/src/modules/sales/POSPage.tsx`
- `app/renderer/src/modules/cash/CashRegisterPage.tsx`
- `app/renderer/src/modules/sales/SalesHistoryPage.tsx`
- `app/renderer/src/shared/theme.ts` (tokens del tema original)

---

## 3. Diseño TailAdmin — Sistema Activo

El sistema de diseño TailAdmin está en:
- `app/renderer/src/styles/tailadmin.css` — **639 líneas** con todas las clases `tc-*`
- Importa fuente **Outfit** de Google Fonts
- Paleta de colores: `brand-500` (#465fff), semánticos, grises
- Componentes reutilizables: `tc-btn`, `tc-card`, `tc-modal`, `tc-metric-card`, `tc-input`, `tc-table`, etc.
- Animaciones: `animate-fadeIn`, `animate-slideUp`, `animate-scaleIn`

**Clases más usadas:**
| Clase | Uso |
|---|---|
| `tc-btn tc-btn--primary` | Botón principal azul gradiente |
| `tc-btn tc-btn--secondary` | Botón secundario blanco con borde |
| `tc-btn tc-btn--ghost` | Botón sin fondo, solo texto |
| `tc-metric-card` | Tarjeta de métrica con icono |
| `tc-section` | Card contenedor con sombra |
| `tc-modal` | Modal con overlay |
| `tc-input` | Input de formulario |
| `tc-grid-4` | Grid responsive 4 columnas |

---

## 4. Funcionalidades que Deben Preservarse

### 4.1 Dashboard (original en `cb11235`)
- Header con saludo, avatar con iniciales, fecha, botones rápidos
- 4 metric cards: Ventas de hoy, Alertas, Estado de caja, Productos
- Panel de control de caja con accesos rápidos a todas las secciones
- Panel lateral de alertas de inventario
- **Debe consumir** `getDashboardSummary()` del backend para datos reales

### 4.2 POS (original en `cb11235`)
- **Escáner de códigos de barras** (hook `useBarcodeScanner`)
- Búsqueda de producto por código manual
- Catálogo de productos con grid de tarjetas
- Carrito con +/- cantidad, eliminar items
- Resumen: Subtotal, IVA, Total
- **Pagos múltiples**: agregar pagos por método (efectivo, nequi, daviplata, tarjeta, transferencia)
- **Pago mixto**: combinar métodos
- **Crédito/Fiado**: seleccionar cliente y fiar saldo
- **Generación de factura**: `generateInvoice` + `openInvoice` de `printer.api.ts`
- **Impresión térmica**: `printToHardware` de `printer.api.ts`
- Indicador de estado de caja activa

### 4.3 Estado de Caja (original en `cb11235`)
- Abrir caja con monto inicial
- Ver resumen: ID, monto inicial, estado, fecha apertura
- Cerrar caja con monto final y diferencia

### 4.4 Clientes (actualizado, funciona)
- `CustomersPage.tsx` — diseño premium con stats cards
- `CustomerFormModal.tsx` — formulario estilo premium
- `CustomerHistoryModal.tsx` — historial estilo premium
- `CustomerDebtsModal.tsx` — abonos con `cashSessionId` ✅

---

## 5. Tareas Pendientes para Mañana

### Prioridad 1: Restaurar POS
1. Restaurar `POSPage.tsx` desde `cb11235` como base
2. Aplicar clases TailAdmin progresivamente (no reemplazar todo de una vez)
3. Verificar que escáner, clientes, pagos, factura y thermal print funcionen

### Prioridad 2: Restaurar Dashboard con Datos
1. Dashboard actual no consume `getDashboardSummary()` — agregarlo
2. Mostrar: ventas de hoy, gráfica semanal, top categorías, ventas recientes
3. Mantener diseño TailAdmin pero con datos reales

### Prioridad 3: Restaurar Estado de Caja
1. Restaurar `CashRegisterPage.tsx` desde `cb11235`
2. Aplicar clases TailAdmin manteniendo funcionalidad

### Prioridad 4: Verificar Todo
1. Build sin errores: `npm run build`
2. Testear flujo completo: Login → Dashboard → POS → Venta → Factura → Caja → Cierre

---

## 6. Comandos Útiles

```bash
# Sincronizar BD (si se cambia schema.prisma)
npx prisma db push --schema=database/schema.prisma && npx prisma generate --schema=database/schema.prisma

# Build
npm run build

# Dev
npm run dev

# Ver archivo original
git show cb11235:app/renderer/src/modules/sales/POSPage.tsx

# Ver diff entre versiones
git diff cb11235..7a27e76 -- app/renderer/src/modules/sales/POSPage.tsx
```

---

## 7. Referencias de API

### Backend (IPC handlers)
| Handler | Archivo | Descripción |
|---|---|---|
| `sales:getDashboardSummary` | `sales.ipc.ts` | Resumen del dashboard |
| `sales:create` | `sales.ipc.ts` | Crear venta |
| `cash:open` | `cash-session.ipc.ts` | Abrir caja |
| `cash:close` | `cash-session.ipc.ts` | Cerrar caja |
| `cash:getActive` | `cash-session.ipc.ts` | Caja activa |
| `cash:getSummary` | `cash-session.ipc.ts` | Resumen de sesión |
| `customers:search` | `customers.ipc.ts` | Buscar clientes |
| `customers:payDebt` | `customers.ipc.ts` | Pagar deuda (acepta `cashSessionId`) |
| `printer:generateInvoice` | `printer.ipc.ts` | Generar factura HTML |
| `printer:openInvoice` | `printer.ipc.ts` | Abrir factura en navegador |
| `printer:printHardware` | `printer.ipc.ts` | Imprimir en térmica |

### Frontend API
| Función | Archivo | Descripción |
|---|---|---|
| `getDashboardSummary()` | `sales.api.ts` | Llama a `sales:getDashboardSummary` |
| `createSale(...)` | `sales.api.ts` | Crea venta |
| `getActiveCashRegister(userId)` | `cash.api.ts` | Caja activa |
| `getAllCustomers()` | `customers.api.ts` | Todos los clientes |
| `getCustomerDebts(id)` | `customers.api.ts` | Deudas de cliente |
| `payCustomerDebt(debtId, amount, method, cashSessionId?)` | `customers.api.ts` | Pagar deuda |
| `generateInvoice(saleId)` | `sales.api.ts` | Generar factura |
| `openInvoice(filePath)` | `printer.api.ts` | Abrir factura |
| `printToHardware(invoice)` | `printer.api.ts` | Imprimir térmica |

---

## 8. Notas Importantes

### Reglas de Estilo (Golden Rules)
1. Usar variables de `tailadmin.css` — nunca colores planos (`red`, `blue`)
2. Tonos brand: `brand-500`, `amber-500`, `success-500`
3. Bordes redondeados: `rounded-2xl` / `rounded-xl`
4. Sombras: `shadow-sm`, `shadow-md`
5. Tipografía: **Outfit** (importada en CSS)
6. Mantener cohesión visual con el resto de la app

### Errores Comunes a Evitar
- ❌ Importar tipos que no existen (ej. `Payment` → usar `SalePayment`)
- ❌ Importar funciones que no existen (ej. `printInvoice` → usar `generateInvoice`)
- ❌ Usar `customer.name` → el campo es `customer.fullName`
- ❌ Usar `product.image` → no existe en `InventoryProduct`
- ❌ Usar `"mixto"` como método de pago → no está en el tipo `PaymentMethod`
- ❌ Ruta de AuthContext: `../../../shared/context/AuthContext` (no `../../../context/`)

### Base de Datos
- Motor: **SQLite** (`database/tucajero.db`)
- ORM: **Prisma** v5.22.0
- Campo clave agregado: `Payment.cashSessionId` (relación con `CashSession`)
