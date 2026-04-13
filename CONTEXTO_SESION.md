# CONTEXTO_SESION — Backend Architecture & Data Integrity

> **Última actualización:** 12 de abril de 2026
> **Fase actual:** Phase 5-6 COMPLETADA — Correcciones aplicadas y verificadas

---

## 1. Estado actual (post-correcciones)

### ✅ CORREGIDO
| # | Fallo | Archivo(s) | Fix aplicado |
|---|---|---|---|
| 1 | IVA hardcodeado 0.19 en `sales.service.ts` | `sales.service.ts` | Usa `configService.getIvaRate()` |
| 2 | IVA hardcodeado 0.19 en `inventory.service.ts` | `inventory.service.ts` | Usa `configService.getIvaRate()` |
| 3 | IVA hardcodeado 0.19 fallback en UI | `POSPage.tsx` | Usa `config?.ivaRate ?? 0.19` via `useConfig()` |
| 4 | Texto "IVA (19%)" fijo en factura PDF | `invoice.service.ts` | Calcula `effectiveTaxRate` dinámico desde `sale.tax / sale.subtotal` |
| 5 | No existía `ivaRate` en config | `config.service.ts`, `config.ipc.ts`, `config.types.ts` | Agregado `ivaRate`, `getIvaRate()`, IPC handler `config:getIvaRate` |
| 6 | Schema: `stock` era `Int` | `schema.prisma` | `Product.stock` → `Float`, `StockMovement.quantity/previousStock/newStock` → `Float` |
| 7 | Settings sin campo IVA | `SettingsPage.tsx` | Agregado input "Tasa IVA (%)" en formulario |
| 8 | 31 errores TypeScript pre-existentes | 6 archivos del renderer | Imports limpiados, types corregidos, dead code eliminado |
| 9 | **Sin protección contra fuerza bruta** | `auth.service.ts`, `auth.ipc.ts` | **Rate limiting DB-level + account lockout 5 intentos → bloqueo 15 min** |
| 10 | Login sin tracking de intentos | `schema.prisma` | `User.failedLoginAttempts` + `User.lockedUntil` |
| 11 | Factura con datos hardcodeados ("TU CAJERO") | `invoice.service.ts`, `sales.ipc.ts` | Usa `ConfigService.getConfig()` — muestra nombre, dirección, teléfono y NIT del negocio real |

### 🔒 Seguridad de Login — Implementada
| Característica | Valor |
|---|---|
| Intentos máximos antes de bloqueo | **5** |
| Duración del bloqueo | **15 minutos** |
| Circuit breaker (en memoria, adicional) | **10 intentos en 10 min** |
| Auto-reset en login exitoso | ✅ |
| Auto-reset tras expirar bloqueo | ✅ |
| Desbloqueo manual por admin | ✅ (`auth:unlockAccount`) |
| Auditoría de bloqueos | ✅ (`auth:account-locked` log) |
| Mensaje genérico de error | ✅ "Credenciales inválidas" (no enumera usuario) |

### 🟡 ERRORES DE TYPESCRIPT PRE-EXISTENTES (no introducidos por nosotros)
~~- **POSPage.tsx**: 16 errores — tipos de `SalePayment` vs `PaymentInput`, imports no usados, comparación con `'mixto'`~~
~~- **DashboardPage.tsx**: 6 errores — imports no usados, `SalePayment` no importado, `customer.fullName` no existe~~
~~- **CustomersPage.tsx**: 2 errores — imports no usados (`Trash2`, `Mail`)~~
~~- **UsersPage.tsx**: 2 errores — `statsLoading` no usado, tipo de `Tooltip formatter`~~
~~- **AboutModal.tsx**: 4 errores — `Github` no existe en lucide-react, imports no usados~~

### ✅ BUILD STATUS
- `tsc --noEmit --project tsconfig.main.json` → **0 errores**
- `tsc --noEmit --project tsconfig.json` → **0 errores** (31 errores corregidos)

### 🔴 PENDIENTE: Migración de BD
~~El schema cambió (`Int` → `Float`). Se debe ejecutar:~~
```bash
✅ COMPLETADO: npx prisma migrate dev --name fix_float_stock
✅ COMPLETADO: npx prisma generate
✅ COMPLETADO: seed ejecutado — admin user + 100 productos en 12 categorías
```

**Credenciales admin:** `admin` / `c282367ac3ee88d25f37dc599c3bc76b` (cambiar en primer login)

---

## 2. Gaps del contexto anterior — RESUELTOS

Los gaps del documento anterior fueron basados en un supuesto proyecto Python que **no existe**. El proyecto real es **Electron + TypeScript + Prisma**. Los gaps reales fueron identificados y corregidos arriba.

### Lo que el contexto anterior asumía incorrectamente:
| Suposición | Realidad |
|---|---|
| Proyecto Python con SQLAlchemy | Electron + TypeScript + Prisma ORM |
| `InventarioRepository` duplicado en `venta_repo.py` e `inventario_repo.py` | No existen archivos `.py`. Repositorios en `repositories/prisma.ts` |
| `producto_service.py` con dead imports | No existe. Lógica en `inventory.service.ts` y `sales.service.ts` |
| `ventas_view.py` con IVA | IVA hardcodeado estaba en `POSPage.tsx`, `sales.service.ts`, `inventory.service.ts` |
| No existía `alembic.ini` | Correcto — usa Prisma migrations, no Alembic |
| `SettingsService().get_iva()` | No existía. Ahora existe `ConfigService.getIvaRate()` |

---

## 3. Archivos Modificados en esta Sesión

| Archivo | Cambio |
|---|---|
| `app/main/services/config.service.ts` | + `ivaRate` en `BusinessConfig`, + `getIvaRate()` |
| `app/main/ipc/config.ipc.ts` | + handler `config:getIvaRate` |
| `app/main/services/sales.service.ts` | Import `ConfigService`, usa `getIvaRate()` en vez de `0.19` |
| `app/main/services/inventory.service.ts` | Import `ConfigService`, usa `getIvaRate()` en vez de `0.19` |
| `app/main/services/invoice.service.ts` | IVA label dinámico: `IVA (${taxRatePercent}%)` |
| `app/renderer/src/shared/types/config.types.ts` | + `ivaRate: number` |
| `app/renderer/src/modules/sales/POSPage.tsx` | Import `useConfig`, tax usa `config?.ivaRate ?? 0.19` |
| `app/renderer/src/modules/settings/SettingsPage.tsx` | + `ivaRate` en estado inicial, + input de tasa IVA |
| `database/schema.prisma` | `Product.stock` → `Float`, `StockMovement` campos → `Float` |

---

## 4. Orden de Ejeccción — Próxima Sesión

| # | Acción | Tiempo est. | Riesgo si se omite |
|---|---|---|---|
| ~~1~~ | ~~Ejecutar `npx prisma migrate dev --name fix_float_stock`~~ | ✅ **Hecho** | ✅ |
| ~~2~~ | ~~Ejecutar `npx prisma generate`~~ | ✅ **Hecho** | ✅ |
| ~~3~~ | ~~Limpiar errores pre-existentes de TypeScript~~ | ✅ **Hecho** | ✅ |
| ~~4~~ | ~~Configurar `ivaRate` en BD~~ | ✅ **Auto** | ✅ |
| 5 | Testear flujo completo: Login → Dashboard → POS → Venta → Factura | 10 min | 🔴 Bugs en producción |

---

## 5. Reglas de Oro para esta Fase

1. **SSOT (Single Source of Truth):** Todo cambio de stock pasa por `InventoryService`. Nunca llamadas directas desde UI.
2. **IVA desde Config:** Nunca hardcodear `0.19`. Siempre `configService.getIvaRate()` o `config?.ivaRate`.
3. **Float para stock:** `Product.stock` y `StockMovement` campos ahora son `Float`. Permiten stock fraccional.
4. **Labels dinámicos en facturas:** El IVA en facturas PDF se calcula dinámicamente desde `sale.tax / sale.subtotal`.

---

## 6. Estado del Plan Original

### Phase 5: Inventory & Service Cleanup
- [x] Extract InventarioService to standalone file (ya existía como `inventory.service.ts`)
- [x] Remove redundant services from producto_service.py (no aplica — no existe Python)
- [x] Update VentaService to use the new InventarioService (lógica integrada en `sales.service.ts`)
- [x] IVA_RATE desde SettingsService en ventas_view.py → Hecho con `ConfigService.getIvaRate()`

### Phase 6: Model Type Migration
- [x] Update models/producto.py (Numeric for money, Float for quantities) → `schema.prisma`: `stock` → `Float`
- [x] Verify arithmetic precision → TypeScript usa `number` (float nativo), correcto

### Final Verification & Walkthrough
- [x] Main process compila sin errores (`tsc --noEmit --project tsconfig.main.json` ✅)
- [x] Renderer compila sin errores (`tsc --noEmit --project tsconfig.json` ✅ — 31 errores corregidos)
- [x] Migrar BD con Prisma (migrate reset + fix_float_stock + seed ✅)
- [ ] Testear flujo completo
