
🏥 TuCajero POS — Farmacias
INSTRUCCIONES FASE 1 — FUNDACIÓN DEL PROYECTO


⚙️  Plataforma de ejecución: Google Antigravity
🤖  IA ejecutora: Qwen
📋  Versión: 1.0.0
📁  Fase: 1 de 5 — Fundación
🎯  Entregable: Proyecto base funcional con DB, diseño y config

🚨 REGLA DE ORO PARA QWEN — LEER ANTES DE EJECUTAR
1. Ejecuta ÚNICAMENTE lo que está escrito en este documento.
2. Si algo no está definido explícitamente → DETENTE y pregunta. No inventes.
3. No tomes decisiones de arquitectura por tu cuenta.
4. No agregues librerías que no estén listadas aquí.
5. Si hay ambigüedad → reporta el problema con la línea exacta del documento.
6. Sigue el orden de pasos exactamente como están numerados.
1. OBJETIVO DE ESTA FASE
Esta fase crea la base técnica completa sobre la que se construirán todos los módulos del sistema. Sin esta fase completa y funcionando, no se puede avanzar a la Fase 2.

1.1 Entregables al finalizar esta fase
•	Repositorio inicializado con estructura de carpetas completa
•	Electron + React + TypeScript corriendo en modo desarrollo
•	Prisma configurado con schema completo y primera migración ejecutada
•	Sistema de diseño: tokens, componentes base, i18n
•	Configuración de ESLint + Prettier + Husky operacional
•	Sistema centralizado de manejo de errores
•	Patrón IPC base funcionando con un ejemplo end-to-end

⚠️  Definición de "Completado" para esta fase
La fase NO está completa hasta que:
  • npm run dev inicia la app sin errores en consola
  • La ventana de Electron abre mostrando una pantalla de prueba con los tokens del tema
  • npx prisma migrate dev ejecuta sin errores
  • npm run lint pasa sin warnings
  • El test de IPC de ejemplo retorna { success: true, data: "pong" }
2. PREREQUISITOS
Verificar que el entorno tiene instalado lo siguiente ANTES de iniciar:

Herramienta	Versión Mínima	Verificación	Obligatorio
Node.js	20.x LTS	node --version	SÍ
npm	10.x	npm --version	SÍ
Git	2.x	git --version	SÍ
VS Code	Cualquiera	—	Recomendado

📌 Nota sobre el entorno
Este proyecto es 100% local. No requiere conexión a internet para funcionar una vez instalado.
Durante el desarrollo sí se necesita internet para instalar dependencias npm.
NO se requiere Docker, ni bases de datos externas, ni servidores adicionales.
3. ESTRUCTURA DE CARPETAS
Crear la siguiente estructura de directorios EXACTAMENTE como se especifica. No agregar ni quitar carpetas.

tucajero/
├── app/
│   ├── main/                     ← Proceso principal de Electron
│   │   ├── main.ts               ← Entry point principal
│   │   ├── preload.ts            ← Script de preload (bridge seguro)
│   │   ├── ipc/                  ← Handlers IPC (equivalente a controllers)
│   │   │   └── ping.ipc.ts       ← Ejemplo de prueba
│   │   ├── services/             ← Lógica de negocio
│   │   │   └── ping.service.ts   ← Ejemplo de prueba
│   │   ├── repositories/         ← Acceso a datos vía Prisma únicamente
│   │   └── utils/
│   │       ├── logger.ts         ← Winston logger
│   │       └── errors.ts         ← Tipos de error centralizados
│   │
│   └── renderer/                 ← Frontend React
│       ├── index.html
│       └── src/
│           ├── main.tsx          ← Entry point React
│           ├── App.tsx           ← Router raíz
│           ├── modules/          ← Un directorio por módulo de negocio
│           │   └── demo/         ← Módulo de prueba de esta fase
│           └── shared/
│               ├── components/   ← Componentes reutilizables
│               │   └── ui/       ← Componentes base (Button, Input, etc.)
│               ├── hooks/        ← Custom hooks
│               ├── store/        ← Zustand stores
│               ├── api/          ← Wrappers de ipcRenderer.invoke()
│               └── types/        ← TypeScript types compartidos
│
├── database/
│   ├── schema.prisma
│   └── migrations/               ← Generado automáticamente por Prisma
│
├── config/
│   ├── theme.config.ts           ← Design tokens
│   └── i18n/
│       └── es.ts                 ← TODOS los textos visibles en español
│
├── assets/
│   └── icons/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.config.js
├── .eslintrc.json
├── .prettierrc
└── .gitignore

🚫 PROHIBIDO
NO crear carpetas adicionales no listadas aquí.
NO mover archivos a ubicaciones distintas a las especificadas.
NO crear archivos de configuración adicionales sin que estén documentados.
4. DEPENDENCIAS Y PACKAGE.JSON
Usar exactamente las siguientes dependencias. No agregar ninguna que no esté en esta lista.

4.1 package.json — contenido completo
{
  "name": "tucajero",
  "version": "0.1.0",
  "description": "POS local para farmacias",
  "main": "dist/main/main.js",
  "scripts": {
    "dev":        "concurrently \"npm run dev:electron\" \"npm run dev:renderer\"",
    "dev:renderer": "vite app/renderer",
    "dev:electron": "tsc -p tsconfig.main.json && electron .",
    "build":      "npm run build:renderer && npm run build:electron",
    "build:renderer": "vite build app/renderer",
    "build:electron": "tsc -p tsconfig.main.json",
    "dist":       "npm run build && electron-builder",
    "lint":       "eslint . --ext .ts,.tsx --max-warnings 0",
    "lint:fix":   "eslint . --ext .ts,.tsx --fix",
    "format":     "prettier --write \"**/*.{ts,tsx,json}\"",
    "test":       "vitest run",
    "test:watch": "vitest",
    "test:e2e":   "playwright test",
    "db:migrate": "prisma migrate dev",
    "db:generate":"prisma generate",
    "db:studio":  "prisma studio"
  },
  "dependencies": {
    "@prisma/client":        "^5.14.0",
    "electron-store":        "^8.2.0",
    "winston":               "^3.13.0",
    "bcryptjs":              "^2.4.3",
    "date-fns":              "^3.6.0",
    "systeminformation":     "^5.22.0",
    "node-thermal-printer":  "^4.3.4",
    "papaparse":             "^5.4.1",
    "xlsx":                  "^0.18.5",
    "pdf-lib":               "^1.17.1",
    "zustand":               "^4.5.0",
    "@tanstack/react-query": "^5.40.0",
    "react-router-dom":      "^6.23.0",
    "react":                 "^18.3.0",
    "react-dom":             "^18.3.0"
  },
  "devDependencies": {
    "electron":              "^30.0.0",
    "electron-builder":      "^24.13.0",
    "concurrently":          "^8.2.0",
    "prisma":                "^5.14.0",
    "@types/react":          "^18.3.0",
    "@types/react-dom":      "^18.3.0",
    "@types/node":           "^20.14.0",
    "@types/bcryptjs":       "^2.4.6",
    "@types/papaparse":      "^5.3.14",
    "typescript":            "^5.4.0",
    "vite":                  "^5.2.0",
    "@vitejs/plugin-react":  "^4.3.0",
    "tailwindcss":           "^3.4.0",
    "autoprefixer":          "^10.4.19",
    "postcss":               "^8.4.38",
    "vitest":                "^1.6.0",
    "@testing-library/react":"^16.0.0",
    "@playwright/test":      "^1.44.0",
    "eslint":                "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.11.0",
    "@typescript-eslint/parser":        "^7.11.0",
    "eslint-plugin-react":   "^7.34.2",
    "eslint-plugin-react-hooks": "^4.6.2",
    "prettier":              "^3.2.5",
    "husky":                 "^9.0.11",
    "lint-staged":           "^15.2.5"
  }
}

4.2 Comando de instalación
Ejecutar en la raíz del proyecto:
npm install

⚠️  Si hay errores de instalación
NO modificar versiones de dependencias sin autorización explícita.
Reportar el error completo de npm para que sea revisado.
NO usar yarn ni pnpm en este proyecto. Solo npm.
5. CONFIGURACIÓN DE TYPESCRIPT

5.1 tsconfig.json — raíz del proyecto
{
  "compilerOptions": {
    "target":           "ES2022",
    "module":           "ESNext",
    "moduleResolution": "bundler",
    "lib":              ["ES2022", "DOM", "DOM.Iterable"],
    "jsx":              "react-jsx",
    "strict":           true,
    "noUnusedLocals":   true,
    "noUnusedParameters": true,
    "noImplicitReturns":  true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop":  true,
    "skipLibCheck":     true,
    "resolveJsonModule": true,
    "baseUrl":          ".",
    "paths": {
      "@shared/*":  ["app/renderer/src/shared/*"],
      "@modules/*": ["app/renderer/src/modules/*"],
      "@config/*":  ["config/*"],
      "@db/*":      ["database/*"]
    }
  },
  "include": ["app/renderer/src/**/*", "config/**/*"],
  "exclude": ["node_modules", "dist"]
}

5.2 tsconfig.main.json — proceso Electron principal
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module":           "CommonJS",
    "moduleResolution": "node",
    "outDir":           "./dist/main",
    "jsx":              "preserve"
  },
  "include": ["app/main/**/*", "database/**/*", "config/**/*"],
  "exclude": ["app/renderer", "node_modules"]
}
6. CONFIGURACIÓN DE VITE

6.1 vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: 'app/renderer',
  plugins: [react()],
  resolve: {
    alias: {
      '@shared':  resolve(__dirname, 'app/renderer/src/shared'),
      '@modules': resolve(__dirname, 'app/renderer/src/modules'),
      '@config':  resolve(__dirname, 'config'),
      '@db':      resolve(__dirname, 'database'),
    }
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  }
});
7. ELECTRON — PROCESO PRINCIPAL

7.1 app/main/main.ts
Este es el entry point principal de Electron. Contiene únicamente la creación de ventana y la carga del renderer.

import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { registerPingIpc } from './ipc/ping.ipc';
import { logger } from './utils/logger';

const isDev = process.env.NODE_ENV === 'development';

function createWindow(): void {
  const win = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth:  1024,
    minHeight: 600,
    title: 'TuCajero',
    webPreferences: {
      preload:           join(__dirname, 'preload.js'),
      contextIsolation:  true,   // OBLIGATORIO — nunca cambiar a false
      nodeIntegration:   false,  // OBLIGATORIO — nunca cambiar a true
      sandbox:           false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  logger.info('app:window-created');
}

app.whenReady().then(() => {
  registerPingIpc();   // registrar handlers IPC
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

7.2 app/main/preload.ts
El preload expone una API segura al renderer. Nunca se expone ipcRenderer directamente.

import { contextBridge, ipcRenderer } from 'electron';
import type { ApiResponse } from '../shared/types/api.types';

// API segura expuesta al Renderer bajo window.api
contextBridge.exposeInMainWorld('api', {
  // Método genérico: invoke(canal, ...args) → ApiResponse<T>
  invoke: <T>(channel: string, ...args: unknown[]): Promise<ApiResponse<T>> =>
    ipcRenderer.invoke(channel, ...args),
});

7.3 Definición de tipos globales para window.api
Crear el archivo: app/renderer/src/shared/types/electron.d.ts

import type { ApiResponse } from './api.types';

declare global {
  interface Window {
    api: {
      invoke<T>(channel: string, ...args: unknown[]): Promise<ApiResponse<T>>;
    };
  }
}

export {};
8. SISTEMA DE ERRORES CENTRALIZADO
Este sistema es la columna vertebral de toda comunicación entre backend y frontend. Debe implementarse EXACTAMENTE como se especifica.

8.1 app/renderer/src/shared/types/api.types.ts
Tipo de respuesta IPC — OBLIGATORIO en todos los handlers del sistema:

// Todas las respuestas IPC siguen este contrato sin excepción
export type ApiResponse<T> =
  | { success: true;  data: T }
  | { success: false; error: { code: string; message: string } };

8.2 app/main/utils/errors.ts
export enum ErrorCode {
  // Genéricos
  UNKNOWN              = 'UNKNOWN',
  VALIDATION           = 'VALIDATION',
  NOT_FOUND            = 'NOT_FOUND',
  UNAUTHORIZED         = 'UNAUTHORIZED',
  FORBIDDEN            = 'FORBIDDEN',
  // Auth
  INVALID_CREDENTIALS  = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED      = 'SESSION_EXPIRED',
  // Inventario
  PRODUCT_NOT_FOUND    = 'PRODUCT_NOT_FOUND',
  DUPLICATE_CODE       = 'DUPLICATE_CODE',
  INSUFFICIENT_STOCK   = 'INSUFFICIENT_STOCK',
  PRODUCT_EXPIRED      = 'PRODUCT_EXPIRED',
  // Caja
  NO_OPEN_SESSION      = 'NO_OPEN_SESSION',
  SESSION_ALREADY_OPEN = 'SESSION_ALREADY_OPEN',
  // Ventas
  EMPTY_CART           = 'EMPTY_CART',
  PAYMENT_MISMATCH     = 'PAYMENT_MISMATCH',
  // Sistema
  DATABASE_ERROR       = 'DATABASE_ERROR',
  LICENSE_INVALID      = 'LICENSE_INVALID',
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Helper para convertir cualquier error al formato ApiResponse
export function toApiError(err: unknown): { code: string; message: string } {
  if (err instanceof AppError) {
    return { code: err.code, message: err.message };
  }
  return {
    code:    ErrorCode.UNKNOWN,
    message: 'Ocurrió un error inesperado. Intenta de nuevo.',
  };
}

8.3 Patrón obligatorio para todos los IPC handlers
Todo handler IPC del sistema DEBE seguir este patrón sin excepción:

import { ipcMain }         from 'electron';
import { toApiError }      from '../utils/errors';
import type { ApiResponse } from '../../renderer/src/shared/types/api.types';

// TEMPLATE para cualquier handler IPC:
ipcMain.handle('modulo:accion', async (_event, payload): Promise<ApiResponse<TipoRetorno>> => {
  try {
    // 1. Validar payload
    // 2. Llamar al service correspondiente
    // 3. Retornar éxito
    return { success: true, data: resultado };
  } catch (err) {
    return { success: false, error: toApiError(err) };
  }
});
9. LOGGER — WINSTON
Crear el archivo: app/main/utils/logger.ts

import winston from 'winston';
import { join }   from 'path';
import { app }    from 'electron';

const logDir = join(app.getPath('userData'), 'logs');

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({
      filename: join(logDir, 'error.log'),
      level:    'error',
    }),
    new winston.transports.File({
      filename: join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`),
      maxFiles: 30,
    }),
  ],
});

if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
  }));
}

📌 Uso del logger en todo el backend
logger.info('sale:created', { saleId: 1, userId: 2, total: 50000 });
logger.warn('stock:low', { productId: 5, stock: 3 });
logger.error('db:query-failed', { error: err.message });

El primer argumento es SIEMPRE un string con formato "modulo:evento".
El segundo argumento es SIEMPRE un objeto con datos relevantes del contexto.
10. BASE DE DATOS — PRISMA SCHEMA
Crear el archivo: database/schema.prisma con el contenido exactamente como se especifica a continuación.

generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ─── USUARIOS Y AUTENTICACIÓN ────────────────────────────────────────────
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  password  String
  role      Role     @default(CASHIER)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  sessions  CashSession[]
  sales     Sale[]
  auditLogs AuditLog[]
}

// ─── PRODUCTOS / INVENTARIO ──────────────────────────────────────────────
model Product {
  id                   Int       @id @default(autoincrement())
  code                 String    @unique
  name                 String
  stock                Int       @default(0)
  price                Decimal
  taxRate              Decimal   @default(0.19)
  suggestedPurchaseQty Int?
  expiryDate           DateTime?
  unitType             UnitType  @default(UNIT)
  conversionFactor     Decimal   @default(1)
  active               Boolean   @default(true)
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  saleItems            SaleItem[]
}

// ─── VENTAS ──────────────────────────────────────────────────────────────
model Sale {
  id            Int          @id @default(autoincrement())
  receiptNumber String       @unique
  userId        Int
  user          User         @relation(fields: [userId],        references: [id])
  cashSessionId Int?
  cashSession   CashSession? @relation(fields: [cashSessionId], references: [id])
  subtotal      Decimal
  taxAmount     Decimal
  discount      Decimal      @default(0)
  total         Decimal
  status        SaleStatus   @default(COMPLETED)
  createdAt     DateTime     @default(now())
  items         SaleItem[]
  payments      Payment[]
}

model SaleItem {
  id        Int      @id @default(autoincrement())
  saleId    Int
  sale      Sale     @relation(fields: [saleId],    references: [id])
  productId Int
  product   Product  @relation(fields: [productId], references: [id])
  quantity  Decimal
  unitPrice Decimal
  taxRate   Decimal
  subtotal  Decimal
  unitType  UnitType
}

model Payment {
  id      Int       @id @default(autoincrement())
  saleId  Int
  sale    Sale      @relation(fields: [saleId], references: [id])
  method  PayMethod
  amount  Decimal
}

// ─── CAJA ────────────────────────────────────────────────────────────────
model CashSession {
  id          Int           @id @default(autoincrement())
  userId      Int
  user        User          @relation(fields: [userId], references: [id])
  openAmount  Decimal
  closeAmount Decimal?
  openedAt    DateTime      @default(now())
  closedAt    DateTime?
  status      SessionStatus @default(OPEN)
  sales       Sale[]
}

// ─── AUDITORÍA ───────────────────────────────────────────────────────────
model AuditLog {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  action    String
  entity    String
  entityId  Int?
  payload   String
  createdAt DateTime @default(now())
}

// ─── CONFIGURACIÓN ───────────────────────────────────────────────────────
model Config {
  id        Int      @id @default(1)
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}

// ─── ENUMS ───────────────────────────────────────────────────────────────
enum Role          { ADMIN  CASHIER }
enum PayMethod     { CASH  TRANSFER  NEQUI  DAVIPLATA }
enum SaleStatus    { COMPLETED  CANCELLED  REFUNDED }
enum SessionStatus { OPEN  CLOSED }
enum UnitType      { UNIT  PACKAGE }

10.2 Variable de entorno para la DB
Crear el archivo .env en la raíz del proyecto:
# .env
# La base de datos se guarda en la carpeta de datos del usuario de la app
# En desarrollo usa una ruta local
DATABASE_URL="file:./tucajero.db"

# Para producción, Electron sobreescribe esta variable en runtime
# apuntando a app.getPath("userData")/tucajero.db
NODE_ENV="development"

10.3 Ejecutar la primera migración
Después de crear el schema, ejecutar en orden:
1.	npx prisma generate    — genera el cliente tipado
2.	npx prisma migrate dev --name init    — crea la migración inicial
3.	Verificar que se crea el archivo database/migrations/*/migration.sql

⚠️  Sobre migraciones
NUNCA modificar el schema.prisma y aplicar los cambios directamente en producción.
Siempre usar: npx prisma migrate dev --name descripcion-del-cambio
Las migraciones son acumulativas — nunca borrar el historial de migraciones.
11. SISTEMA DE DISEÑO — TOKENS
Crear el archivo: config/theme.config.ts con todos los tokens del sistema. Este archivo es la fuente de verdad del diseño.

// config/theme.config.ts
// FUENTE DE VERDAD DEL DISEÑO — No modificar sin autorización

export const tokens = {
  colors: {
    primary:   '#2563EB',
    secondary: '#7C3AED',
    success:   '#16A34A',
    warning:   '#D97706',
    danger:    '#DC2626',
    // Semáforo de stock
    stockGreen:  '#16A34A',   // stock >= 10
    stockYellow: '#D97706',   // stock 5-9
    stockRed:    '#DC2626',   // stock <= 4
    // Alertas de vencimiento
    expiryOk:      '#16A34A', // > 60 días
    expiryWarning: '#EA580C', // 31-60 días (naranja)
    expiryCritical:'#DC2626', // 1-30 días
    expiryExpired: '#7F1D1D', // vencido
    neutral: {
      50:  '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      500: '#6B7280',
      700: '#374151',
      900: '#111827',
    },
    white: '#FFFFFF',
    background: '#F3F4F6',
  },

  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    sizes: {
      xs:   '12px',
      sm:   '14px',
      base: '16px',   // mínimo para UI de caja
      lg:   '18px',
      xl:   '20px',   // mínimo para títulos de diálogos
      '2xl':'24px',
      '3xl':'32px',
    },
    weights: {
      normal:   400,
      medium:   500,
      semibold: 600,
      bold:     700,
    },
    lineHeight: {
      tight:  '1.25',
      normal: '1.5',
      relaxed:'1.75',
    },
  },

  spacing: {
    1: '4px',   2: '8px',   3: '12px',
    4: '16px',  5: '20px',  6: '24px',
    8: '32px',  10:'40px',  12:'48px',
    16:'64px',  20:'80px',
  },

  borderRadius: {
    none: '0',
    sm:   '4px',
    md:   '8px',
    lg:   '12px',
    xl:   '16px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
    md: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.06)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -2px rgba(0,0,0,0.05)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.10), 0 10px 10px -5px rgba(0,0,0,0.04)',
  },

  // Tamaños mínimos táctiles — NUNCA ir por debajo de estos valores
  touch: {
    minTarget:    '44px',   // mínimo WCAG para targets táctiles
    buttonHeight: '52px',   // altura estándar de botones en la app
    inputHeight:  '48px',
    iconButton:   '44px',
  },

  // Z-index layers
  zIndex: {
    base:    0,
    dropdown:10,
    sticky:  20,
    overlay: 30,
    modal:   40,
    toast:   50,
  },

  // Transiciones
  transition: {
    fast:   '100ms ease',
    normal: '200ms ease',
    slow:   '300ms ease',
  },
} as const;

export type Tokens = typeof tokens;
12. INTERNACIONALIZACIÓN — TEXTOS EN ESPAÑOL
Crear el archivo: config/i18n/es.ts
REGLA: Ningún string visible al usuario puede estar hardcodeado en un componente. TODO va en este archivo.

// config/i18n/es.ts
// TODOS los textos visibles al usuario. Sin excepciones.

export const es = {
  app: {
    name: 'TuCajero',
    tagline: 'Sistema de Punto de Venta',
  },
  common: {
    save:       'Guardar',
    cancel:     'Cancelar',
    confirm:    'Confirmar',
    delete:     'Eliminar',
    edit:       'Editar',
    search:     'Buscar...',
    loading:    'Cargando...',
    noResults:  'No se encontraron resultados.',
    yes:        'Sí',
    no:         'No',
    close:      'Cerrar',
    back:       'Volver',
    next:       'Siguiente',
    finish:     'Finalizar',
    required:   'Campo obligatorio',
  },
  auth: {
    title:           'Iniciar sesión',
    username:        'Usuario',
    password:        'Contraseña',
    loginButton:     'Ingresar',
    logout:          'Cerrar sesión',
    sessionExpired:  'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
  },
  errors: {
    invalidCredentials: 'Usuario o contraseña incorrectos.',
    sessionExpired:     'Tu sesión expiró. Inicia sesión nuevamente.',
    forbidden:          'No tienes permiso para realizar esta acción.',
    notFound:           'El elemento solicitado no existe.',
    insufficientStock:  'Stock insuficiente para "{product}". Disponible: {available} unidades.',
    productExpired:     '"{product}" está vencido y no puede venderse.',
    noOpenSession:      'Debes abrir la caja antes de registrar ventas.',
    duplicateCode:      'Ya existe un producto con el código "{code}".',
    emptyCart:          'El carrito está vacío.',
    paymentMismatch:    'El monto pagado no cubre el total de la venta.',
    unknown:            'Ocurrió un error inesperado. Intenta de nuevo.',
  },
  inventory: {
    title:          'Inventario',
    addProduct:     'Agregar producto',
    editProduct:    'Editar producto',
    deleteProduct:  'Eliminar producto',
    importCSV:      'Importar CSV/Excel',
    code:           'Código',
    name:           'Nombre',
    stock:          'Stock',
    price:          'Precio',
    tax:            'IVA',
    suggestedQty:   'Cant. sugerida',
    expiryDate:     'Fecha vencimiento',
    unitType:       'Tipo unidad',
    unit:           'Unidad',
    package:        'Paquete',
    conversionFactor:'Factor conversión',
    expiresIn:      'Vence en {days} días',
    expired:        'VENCIDO',
  },
  sales: {
    title:      'Nueva venta',
    addToCart:  'Agregar al carrito',
    cart:       'Carrito',
    subtotal:   'Subtotal',
    tax:        'IVA',
    discount:   'Descuento',
    total:      'Total a pagar',
    payment:    'Método de pago',
    cash:       'Efectivo',
    transfer:   'Transferencia',
    nequi:      'Nequi',
    daviplata:  'Daviplata',
    change:     'Cambio',
    confirm:    'Confirmar venta',
    print:      'Imprimir recibo',
    newSale:    'Nueva venta',
  },
  cashSession: {
    open:      'Abrir caja',
    close:     'Cerrar caja',
    openAmount:'Monto inicial de caja',
    status:    'Estado de caja',
    isOpen:    'Caja abierta',
    isClosed:  'Caja cerrada',
  },
  dashboard: {
    title:          'Dashboard',
    todaySales:     'Ventas hoy',
    recentSales:    'Ventas recientes',
    activeAlerts:   'Alertas activas',
    lowStockAlert:  'Stock bajo',
    expiryAlert:    'Próximos a vencer',
  },
} as const;

export type I18n = typeof es;
13. TEST DE INTEGRACIÓN IPC — MÓDULO PING
Este módulo de prueba verifica que toda la cadena de comunicación funciona correctamente. Debe eliminarse antes de la Fase 2.

13.1 app/main/services/ping.service.ts
export class PingService {
  ping(): string {
    return 'pong';
  }
}

13.2 app/main/ipc/ping.ipc.ts
import { ipcMain }           from 'electron';
import { PingService }       from '../services/ping.service';
import { toApiError }        from '../utils/errors';
import type { ApiResponse }  from '../../renderer/src/shared/types/api.types';

const pingService = new PingService();

export function registerPingIpc(): void {
  ipcMain.handle('ping:ping', async (): Promise<ApiResponse<string>> => {
    try {
      const result = pingService.ping();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });
}

13.3 app/renderer/src/shared/api/ping.api.ts
import type { ApiResponse } from '../types/api.types';

export async function pingServer(): Promise<ApiResponse<string>> {
  return window.api.invoke<string>('ping:ping');
}

13.4 app/renderer/src/modules/demo/DemoPage.tsx
Pantalla de prueba que verifica la cadena completa:
import { useState }    from 'react';
import { pingServer }  from '@shared/api/ping.api';
import { tokens }      from '@config/theme.config';

export function DemoPage() {
  const [result, setResult] = useState<string>('');

  const handlePing = async () => {
    const response = await pingServer();
    if (response.success) {
      setResult(`✅ IPC funcionando: ${response.data}`);
    } else {
      setResult(`❌ Error: ${response.error.message}`);
    }
  };

  return (
    <div style={{
      display:    'flex',
      flexDirection:'column',
      alignItems: 'center',
      justifyContent:'center',
      height:     '100vh',
      backgroundColor: tokens.colors.background,
      gap: tokens.spacing[4],
    }}>
      <h1 style={{ color: tokens.colors.primary, fontFamily: tokens.typography.fontFamily }}>
        TuCajero — Fase 1 OK
      </h1>
      <button
        onClick={handlePing}
        style={{
          backgroundColor: tokens.colors.primary,
          color:  tokens.colors.white,
          height: tokens.touch.buttonHeight,
          padding: '0 32px',
          borderRadius: tokens.borderRadius.md,
          border: 'none',
          cursor: 'pointer',
          fontSize: tokens.typography.sizes.base,
          fontFamily: tokens.typography.fontFamily,
        }}
      >
        Probar IPC
      </button>
      {result && (
        <p style={{ fontFamily: tokens.typography.fontFamily, fontSize: tokens.typography.sizes.lg }}>
          {result}
        </p>
      )}
    </div>
  );
}
14. CALIDAD DE CÓDIGO — ESLINT + PRETTIER + HUSKY

14.1 .eslintrc.json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "ecmaVersion": 2022, "sourceType": "module", "ecmaFeatures": { "jsx": true } },
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "settings": { "react": { "version": "detect" } },
  "rules": {
    "@typescript-eslint/no-explicit-any":     "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "react/react-in-jsx-scope":               "off",
    "no-console":                             "warn",
    "no-debugger":                            "error"
  }
}

14.2 .prettierrc
{
  "semi":          true,
  "singleQuote":   true,
  "tabWidth":      2,
  "trailingComma": "all",
  "printWidth":    100,
  "arrowParens":   "always"
}

14.3 Configurar Husky (pre-commit hooks)
Ejecutar en orden:
4.	npx husky init
5.	Agregar al archivo .husky/pre-commit:
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx lint-staged
6.	Agregar a package.json, sección "lint-staged":
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix --max-warnings 0", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
15. CHECKLIST DE VERIFICACIÓN FINAL
Verificar CADA ítem antes de declarar la Fase 1 como completada:

#	Verificación	Cómo verificar	Estado
1	Estructura de carpetas creada	Revisar árbol de directorios vs sección 3	☐
2	npm install sin errores	npm install && echo OK	☐
3	TypeScript sin errores	npx tsc --noEmit	☐
4	Prisma schema válido	npx prisma validate	☐
5	Migración inicial creada	Ver carpeta database/migrations/	☐
6	ESLint sin warnings	npm run lint	☐
7	App inicia en modo dev	npm run dev — ventana abre sin errores	☐
8	Test IPC funciona	Clic en "Probar IPC" → respuesta "pong"	☐
9	Tokens visibles en pantalla	DemoPage renderiza con colores correctos	☐
10	Logger crea archivo de log	Verificar carpeta %appdata%/tucajero/logs	☐

🚨 Si algún ítem falla
NO avanzar a la Fase 2.
Reportar el ítem fallido con el error completo.
Esperar instrucciones antes de continuar.

✅ Cuando todos los ítems están marcados
La Fase 1 está completa.
El proyecto está listo para recibir las instrucciones de la Fase 2: Auth + RBAC.
Confirmar completado con: "Fase 1 completada. Todos los checks en verde."
16. GLOSARIO DE TÉRMINOS
Término	Definición
IPC	Inter-Process Communication — mecanismo de comunicación entre el proceso main de Electron y el renderer (UI)
Handler	Función que recibe y procesa un mensaje IPC específico
Service	Clase que contiene la lógica de negocio de un módulo. No accede a la DB directamente
Repository	Clase que accede a la base de datos mediante Prisma. No contiene lógica de negocio
Token	Variable de diseño con valor fijo (color, espaciado, etc.) definida en theme.config.ts
RBAC	Role-Based Access Control — sistema de permisos basado en roles (Admin / Cajero)
DoD	Definition of Done — lista de criterios que deben cumplirse para considerar algo terminado
AppError	Clase de error tipado del sistema. Todo error del backend debe ser instancia de AppError
ApiResponse	Tipo TypeScript que garantiza que toda respuesta IPC tiene estructura success/error
Preload	Script de Electron que actúa como puente seguro entre main y renderer

