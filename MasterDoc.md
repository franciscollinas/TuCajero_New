MASTER DOCUMENT v2.0 — TuCajero POS FARMACIAS

1. VISIÓN Y CONTEXTO
Producto: POS local 100% offline-first, especializado en farmacias, instalable en Windows.
Plataforma de desarrollo: Google Antigravity + Qwen como IA ejecutora.
Usuarios:
RolAccesoRestriccionesAdministradorTotalNingunaCajeroVentas + Inventario básicoSin Configuración, Usuarios, Reportes completos, Auditoría
Regla de IA (Qwen) — irrompible:

Ejecuta solo instrucciones explícitas y completas
Cero decisiones autónomas
Cero suposiciones sobre lo no especificado
Si algo no está definido en el documento → preguntar, no inventar


2. PRINCIPIOS NO NEGOCIABLES
#ProhibidoObligatorio1Código inline o improvisadoTodo modular y tipado2Refactorizar por mala planificaciónArquitectura definida antes de implementar3Mezclar responsabilidadesUI → Service → Repository → DB siempre4Strings hardcodeados visibles al usuarioTodo texto en /config/i18n/es.ts5Lógica de negocio en UISolo en services del main process6Acceso directo a DB desde RendererSolo vía IPC → Service → Repository7Módulo sin testsCobertura mínima 70%8Errores técnicos visibles al usuarioMensajes humanos siempre9IA tomando decisiones no especificadasPreguntar al desarrollador

3. STACK TECNOLÓGICO
Core
CapaTecnologíaVersiónJustificaciónDesktop shellElectron30+Offline-first, instalableFrontendReact + TypeScript18+ / 5+Tipado estrictoBackendNode.js ES Modules20 LTSNativo en ElectronBase de datosSQLite3.xLocal, sin servidorORMPrisma5+Schema-first, migraciones
Frontend
HerramientaPropósitoZustandEstado global (carrito, sesión, alertas)TanStack QueryCache y datos asyncReact Router v6Navegación por módulosshadcn/ui + Radix UIComponentes accesiblesTailwind (tokens restringidos)Solo clases del sistema de diseño
Hardware
DispositivoIntegraciónImpresora térmicanode-thermal-printer — ESC/POSEscáner código de barrasInput HID nativo (el escáner actúa como teclado)
Importación de datos
FormatoLibreríaCSVpapaparseExcel (.xlsx)xlsx (SheetJS)
Exportación / Reportes
FormatoLibreríaPDF facturaspdf-lib o puppeteer headlessExcel reportesxlsx (SheetJS)CSV cortesnativo Node.js
Testing
HerramientaNivelVitestUnit + integraciónReact Testing LibraryComponentes UIPlaywrightE2E flujos críticos

4. ARQUITECTURA
Estructura de proyecto
/app
  /main                          ← Proceso principal Electron
    main.ts
    /ipc
      auth.ipc.ts
      sales.ipc.ts
      inventory.ipc.ts
      cash-session.ipc.ts
      reports.ipc.ts
      backup.ipc.ts
      audit.ipc.ts               ← ⚠️ NUEVO
    /services
      auth.service.ts
      sales.service.ts
      inventory.service.ts
      cash-session.service.ts
      alert.service.ts           ← ⚠️ NUEVO — stock + vencimiento
      audit.service.ts           ← ⚠️ NUEVO
      license.service.ts         ← ⚠️ NUEVO
      printer.service.ts         ← ⚠️ NUEVO
      import.service.ts          ← ⚠️ NUEVO — CSV/Excel
    /repositories
      product.repository.ts
      sale.repository.ts
      cash-session.repository.ts
      audit.repository.ts
    /utils
      logger.ts
      errors.ts
      fingerprint.ts             ← ⚠️ NUEVO — licencia por hardware
      barcode.ts                 ← ⚠️ NUEVO

  /renderer/src
    /modules
      /auth
      /dashboard
      /sales                     ← Incluye carrito + pago mixto
      /inventory                 ← Incluye alertas semáforo + vencimiento
      /cash-session
      /reports
      /users                     ← Solo Admin
      /settings                  ← Solo Admin
      /audit                     ← Solo Admin
    /shared
      /components
        /ui                      ← Componentes base (botones, modales, tablas)
        /alerts                  ← ⚠️ NUEVO — StockBadge, ExpiryBadge
        /dialogs                 ← ⚠️ NUEVO — confirmaciones, errores
        /tables                  ← ⚠️ NUEVO — tabla ordenable/buscable base
      /hooks
        useBarcodeScanner.ts     ← ⚠️ NUEVO
        useAlerts.ts             ← ⚠️ NUEVO
        useRBAC.ts               ← ⚠️ NUEVO
      /store
        cart.store.ts
        session.store.ts
        alert.store.ts
      /api                       ← Wrappers tipados de ipcRenderer.invoke()
      /types
        product.types.ts
        sale.types.ts
        alert.types.ts

  /database
    schema.prisma
    /migrations
    /seeds

  /config
    app.config.ts
    theme.config.ts
    i18n/
      es.ts                      ← ÚNICO archivo de textos

  /assets
  /tests
Patrón de comunicación (inamovible)
Renderer
  → /api/inventory.api.ts         ← ipcRenderer.invoke('inventory:search', query)
    → IPC: 'inventory:search'
      → inventory.ipc.ts          ← valida parámetros
        → InventoryService        ← lógica, alertas, conversiones
          → ProductRepository     ← solo Prisma
            → SQLite
Contrato de respuesta IPC (obligatorio en todos los handlers)
typescripttype ApiResponse<T> =
  | { success: true;  data: T }
  | { success: false; error: { code: ErrorCode; message: string } }

// El Renderer SIEMPRE maneja ambos casos. Sin excepciones.

5. RBAC — CONTROL DE ACCESO
typescriptenum Role { ADMIN = 'ADMIN', CASHIER = 'CASHIER' }

const permissions = {
  ADMIN: [
    'sales:all', 'inventory:all', 'users:all',
    'settings:all', 'reports:all', 'audit:view',
    'cash-session:all', 'backup:all'
  ],
  CASHIER: [
    'sales:create', 'sales:view-own',
    'inventory:view', 'inventory:search',
    'cash-session:open', 'cash-session:close-own'
  ]
}
Hook de control en UI
typescript// Uso en cualquier componente:
const { can } = useRBAC();
if (!can('settings:all')) return <AccessDenied />;
Regla: el backend valida permisos en cada IPC handler, independientemente de lo que muestre o esconda la UI. Doble validación, siempre.

6. BASE DE DATOS — SCHEMA COMPLETO
prismamodel User {
  id        Int       @id @default(autoincrement())
  username  String    @unique
  password  String
  role      Role      @default(CASHIER)
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())
  sessions  CashSession[]
  sales     Sale[]
  auditLogs AuditLog[]
}

model Product {
  id                  Int       @id @default(autoincrement())
  code                String    @unique          // código de barras o interno
  name                String
  stock               Int       @default(0)
  price               Decimal
  taxRate             Decimal   @default(0.19)   // IVA configurable
  suggestedPurchaseQty Int?                      // cantidad sugerida de compra
  expiryDate          DateTime?                  // ⚠️ CRÍTICO para farmacias
  unitType            UnitType  @default(UNIT)
  conversionFactor    Decimal   @default(1)      // paquete → unidades
  active              Boolean   @default(true)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  saleItems           SaleItem[]
}

model Sale {
  id            Int         @id @default(autoincrement())
  userId        Int
  user          User        @relation(fields: [userId], references: [id])
  cashSessionId Int?
  cashSession   CashSession? @relation(fields: [cashSessionId], references: [id])
  subtotal      Decimal
  taxAmount     Decimal
  discount      Decimal     @default(0)
  total         Decimal
  payments      Payment[]   // ⚠️ pago mixto: una venta puede tener N pagos
  status        SaleStatus  @default(COMPLETED)
  receiptNumber String      @unique              // número de factura
  createdAt     DateTime    @default(now())
  items         SaleItem[]
}

model Payment {                                  // ⚠️ NUEVO — soporta pago mixto
  id        Int           @id @default(autoincrement())
  saleId    Int
  sale      Sale          @relation(fields: [saleId], references: [id])
  method    PayMethod
  amount    Decimal
}

model SaleItem {
  id           Int     @id @default(autoincrement())
  saleId       Int
  sale         Sale    @relation(fields: [saleId], references: [id])
  productId    Int
  product      Product @relation(fields: [productId], references: [id])
  quantity     Decimal                           // Decimal por unidades parciales (0.5 paquetes)
  unitPrice    Decimal
  taxRate      Decimal
  subtotal     Decimal
  unitType     UnitType
}

model CashSession {
  id           Int           @id @default(autoincrement())
  userId       Int
  user         User          @relation(fields: [userId], references: [id])
  openAmount   Decimal
  closeAmount  Decimal?
  openedAt     DateTime      @default(now())
  closedAt     DateTime?
  status       SessionStatus @default(OPEN)
  sales        Sale[]
}

model AuditLog {                                 // ⚠️ NUEVO
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  action    String                               // 'sale:created', 'product:edited', etc.
  entity    String                               // 'Sale', 'Product', 'User'
  entityId  Int?
  payload   String                               // JSON del estado anterior/posterior
  createdAt DateTime @default(now())
}

enum Role          { ADMIN CASHIER }
enum PayMethod     { CASH TRANSFER NEQUI DAVIPLATA }
enum SaleStatus    { COMPLETED CANCELLED REFUNDED }
enum SessionStatus { OPEN CLOSED }
enum UnitType      { UNIT PACKAGE }

7. MÓDULOS DETALLADOS
7.1 INVENTARIO (Farmacia-específico)
Campos por producto:
CampoTipoValidaciónCódigoString únicoRequerido, no duplicarNombreStringRequeridoStockInteger≥ 0PrecioDecimal> 0IVADecimalConfigurable (0%, 5%, 19%)Cantidad sugerida compraIntegerOpcional, > 0Fecha de vencimientoDateOpcional pero recomendadaTipo de unidadEnum UNIT/PACKAGERequeridoFactor de conversiónDecimalRequerido si PACKAGE
Tabla de inventario — comportamiento:

Ordenable por cualquier columna (click en header)
Búsqueda en tiempo real (debounce 300ms)
Inserción inteligente: productos nuevos se insertan ordenados alfabéticamente, no al final
Carga masiva: CSV o Excel con validación fila por fila (errores reportados por fila, no rechazo total)

Alertas de Stock (semáforo — visible en tabla):
typescriptconst stockStatus = (stock: number): StockStatus => {
  if (stock >= 10) return 'GREEN';   // Verde — normal
  if (stock >= 5)  return 'YELLOW';  // Amarillo — bajo
  return 'RED';                       // Rojo — crítico ≤ 4
}
Alertas de Vencimiento:
typescriptconst expiryStatus = (expiryDate: Date): ExpiryStatus => {
  const daysLeft = differenceInDays(expiryDate, new Date());
  if (daysLeft <= 0)  return 'EXPIRED';   // Rojo intenso
  if (daysLeft <= 30) return 'CRITICAL';  // Rojo
  if (daysLeft <= 60) return 'WARNING';   // Amarillo/Naranja
  return 'OK';
}
// La tabla muestra: color de fila/badge + "Vence en X días"
Venta por unidad vs paquete:
typescript// Si producto es PACKAGE con factor 12:
// Vender 1 PAQUETE = descontar 12 del stock
// Vender 1 UNIDAD  = descontar 1 del stock
const stockToDeduct = unitType === 'PACKAGE'
  ? quantity * conversionFactor
  : quantity;

7.2 VENTAS
Flujo (máximo 3 pasos):
Paso 1 — SELECCIÓN
  ├── Búsqueda por nombre (tiempo real)
  ├── Búsqueda por código (teclado)
  └── Escaneo código de barras → agrega automáticamente al carrito

Paso 2 — CARRITO + REVISIÓN
  ├── Lista de productos con cantidad editable
  ├── Subtotal + IVA desglosado + Total
  ├── Campo de descuento (solo Admin o con permiso)
  └── Asociar cliente (futuro)

Paso 3 — PAGO
  ├── Selección de método(s) de pago
  ├── Pago mixto: distribuir monto entre métodos
  ├── Cálculo automático de cambio si efectivo
  └── Confirmar → generar factura → imprimir (opcional)
Métodos de pago (combinables en pago mixto):

Efectivo
Transferencia
Nequi
Daviplata

Pago mixto — lógica:
typescript// La suma de todos los pagos debe ser >= total de la venta
// Si efectivo > deuda → calcular cambio
// Los demás métodos no generan cambio
const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
const change = totalPaid - saleTotal; // solo aplica si hay pago en efectivo

7.3 ESCÁNER DE CÓDIGO DE BARRAS
El escáner actúa como teclado HID. La integración es:
typescript// useBarcodeScanner.ts
// Escucha keydown global, acumula caracteres
// Si termina en Enter en < 100ms → es escaneo, no escritura manual
// Busca el código en inventario y agrega al carrito automáticamente
No requiere driver especial. Funciona en cualquier vista donde el hook esté activo.

7.4 FACTURACIÓN
PDF profesional incluye:

Logo y nombre del negocio (desde configuración)
Número de factura único y secuencial
Fecha y hora
Cajero que atendió
Tabla de productos (nombre, cantidad, precio unitario, IVA, subtotal)
Totales desglosados (subtotal, IVA, descuento, total)
Método(s) de pago usados
Cambio entregado (si aplica)

Impresión térmica:

El mismo contenido adaptado a 80mm
Formato ESC/POS vía node-thermal-printer
Opción de imprimir / no imprimir después de cada venta


7.5 DASHBOARD
WidgetDescripciónVentas del díaTotal + número de transaccionesVentas recientesTabla con scroll, últimas 20Alertas activasProductos con stock bajo o próximos a vencerEstado de cajaAbierta/cerrada + monto inicial

7.6 REPORTES (solo Admin)
ReporteExportaCorte de caja por turnoExcel + CSVVentas por períodoExcel + CSVInventario actualExcel + CSVProductos por vencerExcel + CSVAuditoría de accionesVista en pantalla + Excel

7.7 AUDITORÍA
Cada acción relevante genera un registro automático e inmutable:
typescript// Acciones que generan auditoría:
'auth:login'          // quién, cuándo, desde dónde
'auth:logout'
'sale:created'        // id venta, cajero, total
'sale:cancelled'      // quién canceló, cuándo
'product:created'
'product:edited'      // campo anterior → nuevo
'product:deleted'
'cash-session:opened'
'cash-session:closed'
'user:created'
'user:edited'
'backup:created'
'backup:restored'
El cajero no puede ver ni modificar el log de auditoría.

7.8 LICENCIA POR HARDWARE
typescript// fingerprint.ts
import { createHash } from 'crypto';
import si from 'systeminformation'; // librería: systeminformation

export async function generateFingerprint(): Promise<string> {
  const [cpu, disk, network, os] = await Promise.all([
    si.cpu(),
    si.diskLayout(),
    si.networkInterfaces(),
    si.osInfo()
  ]);

  const raw = [
    cpu.manufacturer + cpu.brand,
    disk[0]?.serialNum ?? '',
    network[0]?.mac ?? '',
    os.hostname
  ].join('|');

  return createHash('sha256').update(raw).digest('hex');
}

// La licencia = HMAC(fingerprint + expiryDate, TU_CLAVE_PRIVADA)
// Al iniciar: recalcular fingerprint → validar HMAC → verificar fecha
// Si falla → modo bloqueado con mensaje de contacto
Flujo de relicenciamiento (cuando cambia hardware):

Cliente reporta el nuevo fingerprint (visible en pantalla de bloqueo)
Tú generas nueva licencia con ese fingerprint
Cliente ingresa la nueva clave en la app


8. SISTEMA DE ALERTAS CENTRALIZADAS
Las alertas de stock y vencimiento se calculan en alert.service.ts y se muestran en:

Dashboard (resumen)
Tabla de inventario (por fila)
Notificación al abrir la app (si hay críticos)

typescriptinterface ProductAlert {
  productId: number;
  productName: string;
  alertType: 'STOCK_CRITICAL' | 'STOCK_LOW' | 'EXPIRY_WARNING' | 'EXPIRY_CRITICAL' | 'EXPIRED';
  value: number;            // stock actual o días restantes
  severity: 'RED' | 'YELLOW' | 'ORANGE';
}

9. SISTEMA DE DISEÑO
Tokens
typescriptexport const tokens = {
  colors: {
    primary:   '#2563EB',
    success:   '#16A34A',
    warning:   '#D97706',
    danger:    '#DC2626',
    // Semáforo de stock/vencimiento
    stockGreen:  '#16A34A',
    stockYellow: '#D97706',
    stockRed:    '#DC2626',
    expiryOK:    '#16A34A',
    expiryWarn:  '#EA580C',   // naranja
    expiryCrit:  '#DC2626',
    expiryDead:  '#7F1D1D',   // rojo oscuro — vencido
    neutral: {
      50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB',
      500: '#6B7280', 700: '#374151', 900: '#111827'
    }
  },
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
    sizes: { sm: '14px', base: '16px', lg: '18px', xl: '24px', '2xl': '32px' },
  },
  touch: { minTarget: '44px', buttonHeight: '52px' },
  radius: { sm: '4px', md: '8px', lg: '12px' },
}
Reglas de diálogos y popups

Fuente mínima en modal: 16px cuerpo, 20px título
Fondo semitransparente oscuro (rgba(0,0,0,0.6)) detrás de todo modal
Máximo 2 botones por diálogo (primario + cancelar)
Acciones destructivas: botón rojo + texto explícito de consecuencia
Errores al usuario: siempre en lenguaje humano, nunca códigos técnicos

typescript// Ejemplos de mensajes (en es.ts):
errors: {
  insufficientStock: 'No hay suficiente stock de "{product}". Disponible: {available} unidades.',
  productExpired:    '"{product}" está vencido y no puede venderse.',
  sessionClosed:     'Tu sesión expiró. Vuelve a iniciar sesión.',
  noOpenCashSession: 'Debes abrir la caja antes de registrar ventas.',
}

10. CARGA MASIVA CSV/EXCEL
Columnas esperadas (orden fijo):
codigo | nombre | stock | precio | iva | cantidad_sugerida | fecha_vencimiento | tipo_unidad | factor_conversion
Proceso de validación:

Leer archivo completo
Validar cada fila individualmente
Reportar errores con número de fila y campo: "Fila 14: precio inválido (valor: -5)"
Mostrar resumen: "287 productos válidos, 3 con errores"
El usuario elige: importar los válidos e ignorar errores, o corregir primero
Inserción inteligente: ordenar alfabéticamente, no agregar al final


11. ORDEN DE IMPLEMENTACIÓN
FASE 1 — FUNDACIÓN (sin esta fase, nada más funciona)
  └── Setup Electron + React + TypeScript + Prisma
  └── Sistema de diseño (tokens + componentes base + tabla base)
  └── Schema DB completo + migraciones
  └── i18n (es.ts) + sistema de errores

FASE 2 — NÚCLEO OPERATIVO
  └── Auth + RBAC
  └── Apertura/cierre de caja
  └── Inventario (tabla + alertas semáforo + alertas vencimiento)
  └── Ventas (carrito + pago mixto + factura PDF)

FASE 3 — INTEGRACIÓN HARDWARE
  └── Escáner de código de barras
  └── Impresora térmica

FASE 4 — ADMINISTRACIÓN
  └── Carga masiva CSV/Excel
  └── Usuarios y permisos
  └── Auditoría
  └── Reportes y exportación

FASE 5 — SEGURIDAD Y DISTRIBUCIÓN
  └── Licencia por hardware
  └── Backup & Restore
  └── Dashboard con KPIs
  └── Logging + empaquetado instalador

12. DEFINICIÓN DE "TERMINADO" (DoD)
Un módulo está terminado solo si cumple todo:

 Tipado completo — sin any sin justificación documentada
 UI usa solo tokens del sistema de diseño
 Estados implementados: cargando, vacío, error, sin permisos
 Validaciones en frontend y en service layer
 RBAC validado en el IPC handler del backend
 Acción registrada en auditoría (si aplica)
 Mensajes de error en español humano
 Tests unitarios en services con ≥ 70% cobertura
 Al menos 1 test E2E del flujo principal
 Sin warnings de ESLint
 Code review aprobado


CAMBIOS RESPECTO A v1.0
CambioImpactoContexto farmaciaSchema de producto extendido con vencimiento, IVA, factor conversiónPago mixtoModelo Payment separado de Sale (1 venta → N pagos)Métodos locales ColombiaNequi + Daviplata como métodos nativosAlertas doblesStock semáforo + vencimiento con días restantesAuditoríaMódulo completo, solo AdminEscáner HIDHook dedicado, sin driver externoCarga masivaValidación fila por fila con reporte de erroresLicencia hardwaresysteminformation + HMACImpresora térmicanode-thermal-printer + ESC/POSi18n desde día 1Todos los textos en es.ts