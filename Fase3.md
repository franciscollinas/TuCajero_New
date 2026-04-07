# TuCajero - FASE 3: Inventario

## CONTEXTO
Proyecto Electron + React + TypeScript + Vite con Prisma ORM.
**Estructura real**: `app/main/`, `app/renderer/`, `window.api.invoke()`.
Fase 1 ✅: Setup base, Prisma, IPC, módulos.
Fase 2 🚧: Auth + Caja en curso.

## OBJETIVO FASE 3
Sistema completo de inventario con alertas semáforo, alertas de vencimiento y carga masiva (CSV/Excel).

---

## 1. ESQUEMA PRISMA

### Ampliar `prisma/schema.prisma`:
```prisma
model Product {
  id          Int       @id @default(autoincrement())
  code        String    @unique
  barcode     String?   @unique
  name        String
  description String?
  categoryId  Int
  category    Category  @relation(fields: [categoryId], references: [id])
  price       Float
  cost        Float
  stock       Int       @default(0)
  minStock    Int       @default(5)    // Alerta amarilla
  criticalStock Int     @default(2)    // Alerta roja
  expiryDate  DateTime?
  location    String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  sales       SaleItem[]
  stockMovements StockMovement[]
}

model StockMovement {
  id          Int       @id @default(autoincrement())
  productId   Int
  product     Product   @relation(fields: [productId], references: [id])
  type        String    // 'entrada' | 'salida' | 'ajuste' | 'venta'
  quantity    Int
  previousStock Int
  newStock    Int
  reason      String?
  userId      Int
  user        User      @relation(fields: [userId], references: [id])
  createdAt   DateTime  @default(now())
}

model Category {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  color     String?   // Color hexadecimal para UI
  products  Product[]
}
```

**Migración**:
```bash
npx prisma migrate dev --name add_inventory_system
npx prisma generate
```

---

## 2. BACKEND (Main Process)

### `app/main/services/inventoryService.ts`
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getAllProducts() {
  return await prisma.product.findMany({
    include: { category: true },
    orderBy: { name: 'asc' }
  });
}

export async function getProductById(id: number) {
  return await prisma.product.findUnique({
    where: { id },
    include: { category: true, stockMovements: { take: 10, orderBy: { createdAt: 'desc' } } }
  });
}

export async function getProductByBarcode(barcode: string) {
  return await prisma.product.findUnique({
    where: { barcode },
    include: { category: true }
  });
}

export async function createProduct(data: any) {
  const product = await prisma.product.create({
    data: {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    include: { category: true }
  });
  
  // Registrar movimiento inicial de stock si hay cantidad
  if (data.stock > 0) {
    await registerStockMovement({
      productId: product.id,
      type: 'entrada',
      quantity: data.stock,
      previousStock: 0,
      newStock: data.stock,
      reason: 'Stock inicial',
      userId: data.userId
    });
  }
  
  return product;
}

export async function updateProduct(id: number, data: any) {
  return await prisma.product.update({
    where: { id },
    data: { ...data, updatedAt: new Date() },
    include: { category: true }
  });
}

export async function deleteProduct(id: number) {
  return await prisma.product.update({
    where: { id },
    data: { isActive: false }
  });
}

export async function adjustStock(productId: number, quantity: number, reason: string, userId: number) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Producto no encontrado');
  
  const newStock = product.stock + quantity;
  if (newStock < 0) throw new Error('Stock no puede ser negativo');
  
  await prisma.product.update({
    where: { id: productId },
    data: { stock: newStock }
  });
  
  await registerStockMovement({
    productId,
    type: 'ajuste',
    quantity: Math.abs(quantity),
    previousStock: product.stock,
    newStock,
    reason,
    userId
  });
  
  return { previousStock: product.stock, newStock };
}

export async function registerStockMovement(data: {
  productId: number;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  userId: number;
}) {
  return await prisma.stockMovement.create({ data });
}

// Alertas
export async function getStockAlerts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true }
  });
  
  return {
    critical: products.filter(p => p.stock <= p.criticalStock),
    warning: products.filter(p => p.stock > p.criticalStock && p.stock <= p.minStock),
    ok: products.filter(p => p.stock > p.minStock)
  };
}

export async function getExpiryAlerts() {
  const now = new Date();
  const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      expiryDate: { not: null }
    },
    include: { category: true }
  });
  
  return {
    expired: products.filter(p => p.expiryDate && p.expiryDate < now),
    expiringSoon: products.filter(p => p.expiryDate && p.expiryDate >= now && p.expiryDate <= next30Days),
    ok: products.filter(p => p.expiryDate && p.expiryDate > next30Days)
  };
}

// Carga masiva CSV/Excel
export async function bulkImportProducts(products: any[], userId: number) {
  const results = { success: 0, errors: [] as any[] };
  
  for (const item of products) {
    try {
      // Validar categoría
      let category = await prisma.category.findFirst({ where: { name: item.category } });
      if (!category) {
        category = await prisma.category.create({ data: { name: item.category } });
      }
      
      // Crear o actualizar producto
      const existing = await prisma.product.findFirst({ where: { code: item.code } });
      
      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            price: parseFloat(item.price),
            cost: parseFloat(item.cost),
            stock: parseInt(item.stock),
            categoryId: category.id,
            barcode: item.barcode || null,
            minStock: parseInt(item.minStock) || 5,
            criticalStock: parseInt(item.criticalStock) || 2
          }
        });
      } else {
        await createProduct({
          code: item.code,
          barcode: item.barcode || null,
          name: item.name,
          categoryId: category.id,
          price: parseFloat(item.price),
          cost: parseFloat(item.cost),
          stock: parseInt(item.stock),
          minStock: parseInt(item.minStock) || 5,
          criticalStock: parseInt(item.criticalStock) || 2,
          userId
        });
      }
      
      results.success++;
    } catch (error: any) {
      results.errors.push({ row: item, error: error.message });
    }
  }
  
  return results;
}
```

---

### `app/main/ipc/inventoryHandlers.ts`
```typescript
import { ipcMain } from 'electron';
import * as inventoryService from '../services/inventoryService';

export function registerInventoryHandlers() {
  ipcMain.handle('inventory:getAll', async () => {
    return await inventoryService.getAllProducts();
  });
  
  ipcMain.handle('inventory:getById', async (_, id: number) => {
    return await inventoryService.getProductById(id);
  });
  
  ipcMain.handle('inventory:getByBarcode', async (_, barcode: string) => {
    return await inventoryService.getProductByBarcode(barcode);
  });
  
  ipcMain.handle('inventory:create', async (_, data: any) => {
    return await inventoryService.createProduct(data);
  });
  
  ipcMain.handle('inventory:update', async (_, id: number, data: any) => {
    return await inventoryService.updateProduct(id, data);
  });
  
  ipcMain.handle('inventory:delete', async (_, id: number) => {
    return await inventoryService.deleteProduct(id);
  });
  
  ipcMain.handle('inventory:adjustStock', async (_, productId: number, quantity: number, reason: string, userId: number) => {
    return await inventoryService.adjustStock(productId, quantity, reason, userId);
  });
  
  ipcMain.handle('inventory:getStockAlerts', async () => {
    return await inventoryService.getStockAlerts();
  });
  
  ipcMain.handle('inventory:getExpiryAlerts', async () => {
    return await inventoryService.getExpiryAlerts();
  });
  
  ipcMain.handle('inventory:bulkImport', async (_, products: any[], userId: number) => {
    return await inventoryService.bulkImportProducts(products, userId);
  });
}
```

### Registrar en `app/main/index.ts`:
```typescript
import { registerInventoryHandlers } from './ipc/inventoryHandlers';

// Después de otros handlers
registerInventoryHandlers();
```

---

## 3. FRONTEND (Renderer Process)

### `app/renderer/pages/Inventory.tsx`
```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Product {
  id: number;
  code: string;
  barcode?: string;
  name: string;
  category: { name: string; color?: string };
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  criticalStock: number;
  expiryDate?: Date;
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'critical' | 'warning'
  const { user } = useAuth();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await window.api.invoke('inventory:getAll');
    setProducts(data);
  };

  const getStockColor = (product: Product) => {
    if (product.stock <= product.criticalStock) return 'bg-red-100 text-red-800';
    if (product.stock <= product.minStock) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const filteredProducts = products.filter(p => {
    if (filter === 'critical') return p.stock <= p.criticalStock;
    if (filter === 'warning') return p.stock > p.criticalStock && p.stock <= p.minStock;
    return true;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventario</h1>
        <div className="space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Todos ({products.length})
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={`px-4 py-2 rounded ${filter === 'warning' ? 'bg-yellow-600 text-white' : 'bg-gray-200'}`}
          >
            Advertencia ({products.filter(p => p.stock > p.criticalStock && p.stock <= p.minStock).length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-4 py-2 rounded ${filter === 'critical' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
          >
            Crítico ({products.filter(p => p.stock <= p.criticalStock).length})
          </button>
        </div>
      </div>

      <table className="w-full bg-white rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Código</th>
            <th className="p-3 text-left">Producto</th>
            <th className="p-3 text-left">Categoría</th>
            <th className="p-3 text-right">Precio</th>
            <th className="p-3 text-center">Stock</th>
            <th className="p-3 text-center">Estado</th>
            <th className="p-3 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map(product => (
            <tr key={product.id} className="border-t hover:bg-gray-50">
              <td className="p-3 font-mono text-sm">{product.code}</td>
              <td className="p-3">{product.name}</td>
              <td className="p-3">
                <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: product.category.color }}>
                  {product.category.name}
                </span>
              </td>
              <td className="p-3 text-right">${product.price.toFixed(2)}</td>
              <td className="p-3 text-center font-bold">{product.stock}</td>
              <td className="p-3 text-center">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getStockColor(product)}`}>
                  {product.stock <= product.criticalStock ? 'CRÍTICO' : 
                   product.stock <= product.minStock ? 'BAJO' : 'OK'}
                </span>
              </td>
              <td className="p-3 text-center">
                <button className="text-blue-600 hover:underline text-sm">Ver</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### `app/renderer/pages/BulkImport.tsx`
```typescript
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function BulkImport() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<any>(null);
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = values[i];
      });
      return obj;
    });
  };

  const handleImport = async () => {
    if (!file) return;
    
    const text = await file.text();
    const products = parseCSV(text);
    
    const result = await window.api.invoke('inventory:bulkImport', products, user?.id);
    setResults(result);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Carga Masiva de Productos</h1>
      
      <div className="bg-white p-6 rounded shadow mb-6">
        <h2 className="font-bold mb-4">Formato CSV esperado:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
code,barcode,name,category,price,cost,stock,minStock,criticalStock{'\n'}
P001,7501234567890,Producto 1,Bebidas,15.50,10.00,100,10,3{'\n'}
P002,,Producto 2,Alimentos,25.00,18.00,50,5,2
        </pre>
      </div>

      <div className="bg-white p-6 rounded shadow">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="mb-4"
        />
        <button
          onClick={handleImport}
          disabled={!file}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          Importar Productos
        </button>

        {results && (
          <div className="mt-6">
            <h3 className="font-bold mb-2">Resultados:</h3>
            <p className="text-green-600">✓ Importados: {results.success}</p>
            {results.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-red-600 font-bold">Errores ({results.errors.length}):</p>
                <ul className="text-sm text-red-600 mt-2">
                  {results.errors.slice(0, 10).map((err: any, i: number) => (
                    <li key={i}>Fila {i + 1}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### `app/renderer/components/StockAdjustModal.tsx`
```typescript
import { useState } from 'react';

interface Props {
  product: any;
  onClose: () => void;
  onSave: () => void;
  userId: number;
}

export default function StockAdjustModal({ product, onClose, onSave, userId }: Props) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState<'add' | 'subtract'>('add');

  const handleSubmit = async () => {
    const adjustment = type === 'add' ? parseInt(quantity) : -parseInt(quantity);
    await window.api.invoke('inventory:adjustStock', product.id, adjustment, reason, userId);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Ajustar Stock: {product.name}</h2>
        <p className="mb-4">Stock actual: <span className="font-bold">{product.stock}</span></p>

        <div className="mb-4">
          <label className="block mb-2">Tipo:</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'add' | 'subtract')}
            className="w-full border p-2 rounded"
          >
            <option value="add">Entrada</option>
            <option value="subtract">Salida</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-2">Cantidad:</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full border p-2 rounded"
            min="1"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2">Razón:</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border p-2 rounded"
            placeholder="Ej: Inventario físico, devolución..."
          />
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            Guardar
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 p-2 rounded hover:bg-gray-400"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. DASHBOARD DE ALERTAS

### `app/renderer/components/InventoryAlerts.tsx`
```typescript
import { useEffect, useState } from 'react';

export default function InventoryAlerts() {
  const [stockAlerts, setStockAlerts] = useState<any>(null);
  const [expiryAlerts, setExpiryAlerts] = useState<any>(null);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000); // Cada minuto
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    const stock = await window.api.invoke('inventory:getStockAlerts');
    const expiry = await window.api.invoke('inventory:getExpiryAlerts');
    setStockAlerts(stock);
    setExpiryAlerts(expiry);
  };

  if (!stockAlerts || !expiryAlerts) return <div>Cargando alertas...</div>;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-bold mb-3">Alertas de Stock</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-red-50 rounded">
            <span className="text-red-800">Stock Crítico</span>
            <span className="font-bold text-red-600">{stockAlerts.critical.length}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
            <span className="text-yellow-800">Stock Bajo</span>
            <span className="font-bold text-yellow-600">{stockAlerts.warning.length}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-green-50 rounded">
            <span className="text-green-800">Stock OK</span>
            <span className="font-bold text-green-600">{stockAlerts.ok.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-bold mb-3">Alertas de Vencimiento</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-red-50 rounded">
            <span className="text-red-800">Vencidos</span>
            <span className="font-bold text-red-600">{expiryAlerts.expired.length}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
            <span className="text-yellow-800">Vencen pronto (30d)</span>
            <span className="font-bold text-yellow-600">{expiryAlerts.expiringSoon.length}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-green-50 rounded">
            <span className="text-green-800">Vigentes</span>
            <span className="font-bold text-green-600">{expiryAlerts.ok.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. DEPENDENCIAS
```bash
npm install papaparse
npm install -D @types/papaparse
```

---

## CHECKLIST FASE 3

- [ ] Esquema Prisma con Product, StockMovement
- [ ] inventoryService: CRUD + alertas + carga masiva
- [ ] IPC handlers registrados
- [ ] Página Inventory con tabla + semáforo
- [ ] Filtros por estado de stock
- [ ] Modal de ajuste de stock
- [ ] Página BulkImport con parser CSV
- [ ] Componente InventoryAlerts
- [ ] Probar: crear producto, ajustar stock, importar CSV, ver alertas

---

**SIGUIENTE**: Fase 4 - Ventas (carrito, pago mixto, factura PDF)