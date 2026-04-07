# TuCajero - FASE 2: Autenticación y Caja

## CONTEXTO
Proyecto Electron + React + TypeScript + Vite con SQLite (Drizzle ORM).
Fase 1 completada: setup base, DB inicial, IPC básico, estructura modular.

## OBJETIVO FASE 2
Implementar login, roles (RBAC) y gestión completa de caja (apertura/cierre/arqueo).

---

## 1. ESQUEMA DE BASE DE DATOS

### Ampliar `src/main/database/schema.ts`:
```typescript
// Tabla usuarios
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(), // hash bcrypt
  fullName: text('full_name').notNull(),
  role: text('role').notNull(), // 'admin' | 'cajero' | 'supervisor'
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

// Tabla sesiones
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

// Tabla cajas
export const cashRegisters = sqliteTable('cash_registers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  openedAt: integer('opened_at', { mode: 'timestamp' }).notNull(),
  closedAt: integer('closed_at', { mode: 'timestamp' }),
  initialCash: real('initial_cash').notNull(),
  finalCash: real('final_cash'),
  expectedCash: real('expected_cash'),
  difference: real('difference'),
  status: text('status').notNull() // 'open' | 'closed'
});
```

---

## 2. BACKEND (Main Process)

### `src/main/services/authService.ts`
```typescript
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { db } from '../database';
import { users, sessions } from '../database/schema';
import { eq, and, gt } from 'drizzle-orm';

export async function login(username: string, password: string) {
  const user = await db.select().from(users).where(eq(users.username, username)).get();
  if (!user || !user.isActive) throw new Error('Usuario inválido');
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Contraseña incorrecta');
  
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 horas
  
  await db.insert(sessions).values({
    userId: user.id,
    token,
    expiresAt,
    createdAt: new Date()
  });
  
  return { token, user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName } };
}

export async function validateSession(token: string) {
  const session = await db.select().from(sessions)
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .get();
  
  if (!session) throw new Error('Sesión inválida o expirada');
  
  const user = await db.select().from(users).where(eq(users.id, session.userId)).get();
  return { id: user.id, username: user.username, role: user.role, fullName: user.fullName };
}

export async function logout(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}
```

### `src/main/services/cashRegisterService.ts`
```typescript
import { db } from '../database';
import { cashRegisters } from '../database/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function openCashRegister(userId: number, initialCash: number) {
  const openRegister = await db.select().from(cashRegisters)
    .where(and(eq(cashRegisters.userId, userId), eq(cashRegisters.status, 'open')))
    .get();
  
  if (openRegister) throw new Error('Ya tienes una caja abierta');
  
  const result = await db.insert(cashRegisters).values({
    userId,
    openedAt: new Date(),
    initialCash,
    status: 'open'
  }).returning();
  
  return result[0];
}

export async function closeCashRegister(registerId: number, finalCash: number, expectedCash: number) {
  const difference = finalCash - expectedCash;
  
  await db.update(cashRegisters)
    .set({
      closedAt: new Date(),
      finalCash,
      expectedCash,
      difference,
      status: 'closed'
    })
    .where(eq(cashRegisters.id, registerId));
  
  return { finalCash, expectedCash, difference };
}

export async function getActiveCashRegister(userId: number) {
  return await db.select().from(cashRegisters)
    .where(and(eq(cashRegisters.userId, userId), eq(cashRegisters.status, 'open')))
    .get();
}
```

### `src/main/ipc/authHandlers.ts`
```typescript
import { ipcMain } from 'electron';
import * as authService from '../services/authService';

export function registerAuthHandlers() {
  ipcMain.handle('auth:login', async (_, username: string, password: string) => {
    return await authService.login(username, password);
  });
  
  ipcMain.handle('auth:validate', async (_, token: string) => {
    return await authService.validateSession(token);
  });
  
  ipcMain.handle('auth:logout', async (_, token: string) => {
    await authService.logout(token);
  });
}
```

### `src/main/ipc/cashRegisterHandlers.ts`
```typescript
import { ipcMain } from 'electron';
import * as cashService from '../services/cashRegisterService';

export function registerCashRegisterHandlers() {
  ipcMain.handle('cash:open', async (_, userId: number, initialCash: number) => {
    return await cashService.openCashRegister(userId, initialCash);
  });
  
  ipcMain.handle('cash:close', async (_, registerId: number, finalCash: number, expectedCash: number) => {
    return await cashService.closeCashRegister(registerId, finalCash, expectedCash);
  });
  
  ipcMain.handle('cash:getActive', async (_, userId: number) => {
    return await cashService.getActiveCashRegister(userId);
  });
}
```

### Registrar handlers en `src/main/index.ts`
```typescript
import { registerAuthHandlers } from './ipc/authHandlers';
import { registerCashRegisterHandlers } from './ipc/cashRegisterHandlers';

// Después de registerCategoryHandlers()
registerAuthHandlers();
registerCashRegisterHandlers();
```

---

## 3. FRONTEND (Renderer Process)

### `src/renderer/context/AuthContext.tsx`
```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  role: string;
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthorized: (requiredRole: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      window.electron.ipcRenderer.invoke('auth:validate', token)
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        });
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    const { token, user } = await window.electron.ipcRenderer.invoke('auth:login', username, password);
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
  };

  const logout = async () => {
    if (token) await window.electron.ipcRenderer.invoke('auth:logout', token);
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const isAuthorized = (requiredRoles: string[]) => {
    return user ? requiredRoles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthorized }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};
```

### `src/renderer/pages/Login.tsx`
```typescript
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6">TuCajero - Login</h1>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          />
          <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
```

### `src/renderer/pages/CashRegister.tsx`
```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function CashRegister() {
  const { user } = useAuth();
  const [activeCash, setActiveCash] = useState<any>(null);
  const [initialCash, setInitialCash] = useState('');
  const [finalCash, setFinalCash] = useState('');

  useEffect(() => {
    loadActiveCash();
  }, []);

  const loadActiveCash = async () => {
    const cash = await window.electron.ipcRenderer.invoke('cash:getActive', user?.id);
    setActiveCash(cash);
  };

  const handleOpen = async () => {
    await window.electron.ipcRenderer.invoke('cash:open', user?.id, parseFloat(initialCash));
    loadActiveCash();
  };

  const handleClose = async () => {
    const expectedCash = activeCash.initialCash + 1000; // Simplificado, luego calcular con ventas
    await window.electron.ipcRenderer.invoke('cash:close', activeCash.id, parseFloat(finalCash), expectedCash);
    loadActiveCash();
  };

  if (!activeCash) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Apertura de Caja</h1>
        <input
          type="number"
          placeholder="Base inicial"
          value={initialCash}
          onChange={(e) => setInitialCash(e.target.value)}
          className="border p-2 rounded mr-2"
        />
        <button onClick={handleOpen} className="bg-green-600 text-white px-4 py-2 rounded">
          Abrir Caja
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Caja Activa</h1>
      <p>Base inicial: ${activeCash.initialCash}</p>
      <p>Abierta: {new Date(activeCash.openedAt).toLocaleString()}</p>
      
      <div className="mt-6">
        <h2 className="font-bold mb-2">Cierre de Caja</h2>
        <input
          type="number"
          placeholder="Efectivo final"
          value={finalCash}
          onChange={(e) => setFinalCash(e.target.value)}
          className="border p-2 rounded mr-2"
        />
        <button onClick={handleClose} className="bg-red-600 text-white px-4 py-2 rounded">
          Cerrar Caja
        </button>
      </div>
    </div>
  );
}
```

### Rutas protegidas en `src/renderer/App.tsx`
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import CashRegister from './pages/CashRegister';
import Dashboard from './pages/Dashboard';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, isAuthorized } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  if (roles && !isAuthorized(roles)) return <Navigate to="/dashboard" />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/cash" element={<ProtectedRoute roles={['cajero', 'admin']}><CashRegister /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

---

## 4. SEED INICIAL

### `src/main/database/seed.ts`
```typescript
import bcrypt from 'bcrypt';
import { db } from './index';
import { users } from './schema';

export async function seedDatabase() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  await db.insert(users).values({
    username: 'admin',
    password: adminPassword,
    fullName: 'Administrador',
    role: 'admin',
    createdAt: new Date()
  }).onConflictDoNothing();
}
```

Llamar en `src/main/database/index.ts` después de `migrate()`.

---

## 5. DEPENDENCIAS ADICIONALES
```bash
npm install bcrypt
npm install -D @types/bcrypt
```

---

## CHECKLIST FASE 2

- [ ] Esquema DB ampliado (users, sessions, cashRegisters)
- [ ] authService: login, logout, validateSession
- [ ] cashRegisterService: open, close, getActive
- [ ] IPC handlers registrados
- [ ] AuthContext con localStorage
- [ ] Login page funcional
- [ ] Rutas protegidas por rol
- [ ] CashRegister page (abrir/cerrar)
- [ ] Seed con usuario admin
- [ ] Probar flujo completo: login → abrir caja → cerrar caja

---

**SIGUIENTE**: Fase 3 - Inventario (alertas, CSV, semáforo stock)