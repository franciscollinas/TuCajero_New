# TuCajero - FASE 4: Ventas

## CONTEXTO
Proyecto Electron + React + TypeScript + Vite con Prisma ORM.
**Estructura real**: `app/main/`, `app/renderer/`, `window.api.invoke()`.
Fases completadas: 1 ✅ Setup | 2 ✅ Auth+Caja | 3 ✅ Inventario

## OBJETIVO FASE 4
Sistema completo de ventas con carrito, pagos mixtos (efectivo + Nequi/Daviplata/tarjeta) y generación de factura PDF.

---

## 1. ESQUEMA PRISMA

### Ampliar `prisma/schema.prisma`:
```prisma
model Sale {
  id              Int       @id @default(autoincrement())
  saleNumber      String    @unique  // Formato: V-2024-0001
  cashRegisterId  Int
  cashRegister    CashRegister @relation(fields: [cashRegisterId], references: [id])
  userId          Int
  user            User      @relation(fields: [userId], references: [id])
  subtotal        Float
  tax             Float     @default(0)
  discount        Float     @default(0)
  total           Float
  status          String    @default("completed") // 'completed' | 'cancelled'
  createdAt       DateTime  @default(now())
  
  items           SaleItem[]
  payments        Payment[]
}

model SaleItem {
  id          Int       @id @default(autoincrement())
  saleId      Int
  sale        Sale      @relation(fields: [saleId], references: [id])
  productId   Int
  product     Product   @relation(fields: [productId], references: [id])
  quantity    Int
  unitPrice   Float
  subtotal    Float
  discount    Float     @default(0)
  total       Float
}

model Payment {
  id          Int       @id @default(autoincrement())
  saleId      Int
  sale        Sale      @relation(fields: [saleId], references: [id])
  method      String    // 'efectivo' | 'nequi' | 'daviplata' | 'tarjeta' | 'transferencia'
  amount      Float
  reference   String?   // Número de transacción/aprobación
  createdAt   DateTime  @default(now())
}

// Actualizar modelo CashRegister
model CashRegister {
  // ... campos existentes
  sales       Sale[]
}

// Actualizar modelo User
model User {
  // ... campos existentes
  sales       Sale[]
  stockMovements StockMovement[]
}
```

**Migración**:
```bash
npx prisma migrate dev --name add_sales_system
npx prisma generate
```

---

## 2. BACKEND (Main Process)

### `app/main/services/salesService.ts`
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CartItem {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface PaymentItem {
  method: string;
  amount: number;
  reference?: string;
}

export async function createSale(
  cashRegisterId: number,
  userId: number,
  items: CartItem[],
  payments: PaymentItem[],
  discount: number = 0
) {
  // Generar número de venta
  const year = new Date().getFullYear();
  const lastSale = await prisma.sale.findFirst({
    where: { saleNumber: { startsWith: `V-${year}-` } },
    orderBy: { saleNumber: 'desc' }
  });
  
  const nextNumber = lastSale 
    ? parseInt(lastSale.saleNumber.split('-')[2]) + 1 
    : 1;
  const saleNumber = `V-${year}-${nextNumber.toString().padStart(4, '0')}`;

  // Calcular totales
  const subtotal = items.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    return sum + (itemSubtotal - item.discount);
  }, 0);
  
  const tax = subtotal * 0.19; // IVA 19%
  const total = subtotal + tax - discount;

  // Validar pagos
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  if (Math.abs(totalPaid - total) > 0.01) {
    throw new Error(`Total pagado ($${totalPaid}) no coincide con total ($${total})`);
  }

  // Validar stock
  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) throw new Error(`Producto ${item.productId} no encontrado`);
    if (product.stock < item.quantity) {
      throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}`);
    }
  }

  // Crear venta en transacción
  const sale = await prisma.$transaction(async (tx) => {
    // Crear venta
    const newSale = await tx.sale.create({
      data: {
        saleNumber,
        cashRegisterId,
        userId,
        subtotal,
        tax,
        discount,
        total,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            subtotal: item.quantity * item.unitPrice,
            total: (item.quantity * item.unitPrice) - item.discount
          }))
        },
        payments: {
          create: payments.map(p => ({
            method: p.method,
            amount: p.amount,
            reference: p.reference
          }))
        }
      },
      include: {
        items: { include: { product: true } },
        payments: true,
        user: { select: { fullName: true } }
      }
    });

    // Descontar stock y registrar movimientos
    for (const item of items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const newStock = product.stock - item.quantity;
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: newStock }
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'venta',
          quantity: item.quantity,
          previousStock: product.stock,
          newStock,
          reason: `Venta ${saleNumber}`,
          userId
        }
      });
    }

    // Actualizar efectivo esperado en caja
    const effectivoPayment = payments.find(p => p.method === 'efectivo');
    if (effectivoPayment) {
      const cashRegister = await tx.cashRegister.findUnique({ where: { id: cashRegisterId } });
      if (cashRegister) {
        await tx.cashRegister.update({
          where: { id: cashRegisterId },
          data: { expectedCash: (cashRegister.expectedCash || cashRegister.initialCash) + effectivoPayment.amount }
        });
      }
    }

    return newSale;
  });

  return sale;
}

export async function getSaleById(id: number) {
  return await prisma.sale.findUnique({
    where: { id },
    include: {
      items: { include: { product: { include: { category: true } } } },
      payments: true,
      user: { select: { fullName: true, username: true } },
      cashRegister: true
    }
  });
}

export async function getSaleByNumber(saleNumber: string) {
  return await prisma.sale.findUnique({
    where: { saleNumber },
    include: {
      items: { include: { product: { include: { category: true } } } },
      payments: true,
      user: { select: { fullName: true, username: true } },
      cashRegister: true
    }
  });
}

export async function getSalesByCashRegister(cashRegisterId: number) {
  return await prisma.sale.findMany({
    where: { cashRegisterId },
    include: {
      items: { include: { product: true } },
      payments: true,
      user: { select: { fullName: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getSalesByDateRange(startDate: Date, endDate: Date) {
  return await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      items: { include: { product: true } },
      payments: true,
      user: { select: { fullName: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function cancelSale(id: number, userId: number) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!sale) throw new Error('Venta no encontrada');
  if (sale.status === 'cancelled') throw new Error('Venta ya cancelada');

  // Restaurar stock en transacción
  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    for (const item of sale.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const newStock = product.stock + item.quantity;
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: newStock }
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'ajuste',
          quantity: item.quantity,
          previousStock: product.stock,
          newStock,
          reason: `Cancelación venta ${sale.saleNumber}`,
          userId
        }
      });
    }
  });

  return { success: true };
}

export async function getDailySummary(cashRegisterId: number) {
  const sales = await getSalesByCashRegister(cashRegisterId);
  const completed = sales.filter(s => s.status === 'completed');
  
  const totalSales = completed.length;
  const totalAmount = completed.reduce((sum, s) => sum + s.total, 0);
  
  const paymentsByMethod = completed.reduce((acc, sale) => {
    sale.payments.forEach(p => {
      acc[p.method] = (acc[p.method] || 0) + p.amount;
    });
    return acc;
  }, {} as Record<string, number>);

  return {
    totalSales,
    totalAmount,
    paymentsByMethod,
    sales: completed
  };
}
```

---

### `app/main/services/invoiceService.ts`
```typescript
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export async function generateInvoicePDF(sale: any) {
  const doc = new PDFDocument({ margin: 50 });
  const fileName = `Factura_${sale.saleNumber}.pdf`;
  const filePath = path.join(app.getPath('downloads'), fileName);
  
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Encabezado
  doc.fontSize(20).text('TU CAJERO', { align: 'center' });
  doc.fontSize(10).text('NIT: 900.123.456-7', { align: 'center' });
  doc.text('Calle 123 #45-67, Bogotá', { align: 'center' });
  doc.text('Tel: (601) 234-5678', { align: 'center' });
  doc.moveDown();

  doc.fontSize(16).text(`FACTURA ${sale.saleNumber}`, { align: 'center' });
  doc.fontSize(10).text(`Fecha: ${new Date(sale.createdAt).toLocaleString('es-CO')}`, { align: 'center' });
  doc.text(`Cajero: ${sale.user.fullName}`, { align: 'center' });
  doc.moveDown();

  // Línea separadora
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  // Tabla de productos
  const tableTop = doc.y;
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Producto', 50, tableTop);
  doc.text('Cant.', 300, tableTop, { width: 50, align: 'right' });
  doc.text('P.Unit', 360, tableTop, { width: 80, align: 'right' });
  doc.text('Total', 450, tableTop, { width: 100, align: 'right' });
  doc.font('Helvetica');

  let y = tableTop + 20;
  sale.items.forEach((item: any) => {
    doc.text(item.product.name, 50, y);
    doc.text(item.quantity.toString(), 300, y, { width: 50, align: 'right' });
    doc.text(`$${item.unitPrice.toFixed(2)}`, 360, y, { width: 80, align: 'right' });
    doc.text(`$${item.total.toFixed(2)}`, 450, y, { width: 100, align: 'right' });
    y += 20;
  });

  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  // Totales
  const totalsX = 400;
  doc.text(`Subtotal:`, totalsX, doc.y);
  doc.text(`$${sale.subtotal.toFixed(2)}`, totalsX + 100, doc.y, { width: 100, align: 'right' });
  doc.moveDown(0.5);

  doc.text(`IVA (19%):`, totalsX, doc.y);
  doc.text(`$${sale.tax.toFixed(2)}`, totalsX + 100, doc.y, { width: 100, align: 'right' });
  doc.moveDown(0.5);

  if (sale.discount > 0) {
    doc.text(`Descuento:`, totalsX, doc.y);
    doc.text(`-$${sale.discount.toFixed(2)}`, totalsX + 100, doc.y, { width: 100, align: 'right' });
    doc.moveDown(0.5);
  }

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text(`TOTAL:`, totalsX, doc.y);
  doc.text(`$${sale.total.toFixed(2)}`, totalsX + 100, doc.y, { width: 100, align: 'right' });
  doc.font('Helvetica').fontSize(10);
  doc.moveDown();

  // Métodos de pago
  doc.moveDown();
  doc.text('PAGOS:', 50, doc.y);
  doc.moveDown(0.5);
  sale.payments.forEach((payment: any) => {
    const methodName = {
      efectivo: 'Efectivo',
      nequi: 'Nequi',
      daviplata: 'Daviplata',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia'
    }[payment.method] || payment.method;
    
    doc.text(`${methodName}: $${payment.amount.toFixed(2)}`, 70, doc.y);
    if (payment.reference) {
      doc.text(`  Ref: ${payment.reference}`, 70, doc.y);
    }
    doc.moveDown(0.5);
  });

  doc.moveDown(2);
  doc.fontSize(8).text('Gracias por su compra', { align: 'center' });

  doc.end();

  return new Promise<string>((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}
```

---

### `app/main/ipc/salesHandlers.ts`
```typescript
import { ipcMain } from 'electron';
import * as salesService from '../services/salesService';
import * as invoiceService from '../services/invoiceService';

export function registerSalesHandlers() {
  ipcMain.handle('sales:create', async (_, cashRegisterId, userId, items, payments, discount) => {
    return await salesService.createSale(cashRegisterId, userId, items, payments, discount);
  });
  
  ipcMain.handle('sales:getById', async (_, id) => {
    return await salesService.getSaleById(id);
  });
  
  ipcMain.handle('sales:getByNumber', async (_, saleNumber) => {
    return await salesService.getSaleByNumber(saleNumber);
  });
  
  ipcMain.handle('sales:getByCashRegister', async (_, cashRegisterId) => {
    return await salesService.getSalesByCashRegister(cashRegisterId);
  });
  
  ipcMain.handle('sales:getByDateRange', async (_, startDate, endDate) => {
    return await salesService.getSalesByDateRange(new Date(startDate), new Date(endDate));
  });
  
  ipcMain.handle('sales:cancel', async (_, id, userId) => {
    return await salesService.cancelSale(id, userId);
  });
  
  ipcMain.handle('sales:getDailySummary', async (_, cashRegisterId) => {
    return await salesService.getDailySummary(cashRegisterId);
  });
  
  ipcMain.handle('sales:generateInvoice', async (_, saleId) => {
    const sale = await salesService.getSaleById(saleId);
    if (!sale) throw new Error('Venta no encontrada');
    return await invoiceService.generateInvoicePDF(sale);
  });
}
```

### Registrar en `app/main/index.ts`:
```typescript
import { registerSalesHandlers } from './ipc/salesHandlers';

// Después de otros handlers
registerSalesHandlers();
```

---

## 3. FRONTEND (Renderer Process)

### `app/renderer/pages/POS.tsx`
```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface CartItem {
  product: any;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface Payment {
  method: string;
  amount: number;
  reference?: string;
}

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeCashRegister, setActiveCashRegister] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadActiveCashRegister();
  }, []);

  const loadActiveCashRegister = async () => {
    const cash = await window.api.invoke('cash:getActive', user?.id);
    setActiveCashRegister(cash);
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    const product = await window.api.invoke('inventory:getByBarcode', barcode);
    if (!product) {
      alert('Producto no encontrado');
      return;
    }

    addToCart(product);
    setBarcode('');
  };

  const addToCart = (product: any) => {
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity++;
      newCart[existingIndex].total = newCart[existingIndex].quantity * newCart[existingIndex].unitPrice;
      setCart(newCart);
    } else {
      setCart([...cart, {
        product,
        quantity: 1,
        unitPrice: product.price,
        discount: 0,
        total: product.price
      }]);
    }
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }
    const newCart = [...cart];
    newCart[index].quantity = quantity;
    newCart[index].total = quantity * newCart[index].unitPrice - newCart[index].discount;
    setCart(newCart);
  };

  const removeItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const getSubtotal = () => cart.reduce((sum, item) => sum + item.total, 0);
  const getTax = () => getSubtotal() * 0.19;
  const getTotal = () => getSubtotal() + getTax();
  const getTotalPaid = () => payments.reduce((sum, p) => sum + p.amount, 0);
  const getRemaining = () => getTotal() - getTotalPaid();

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('Carrito vacío');
      return;
    }

    if (!activeCashRegister) {
      alert('No hay caja abierta');
      return;
    }

    if (getRemaining() > 0.01) {
      alert('Falta pagar $' + getRemaining().toFixed(2));
      return;
    }

    try {
      const items = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount
      }));

      const sale = await window.api.invoke(
        'sales:create',
        activeCashRegister.id,
        user?.id,
        items,
        payments,
        0
      );

      // Generar factura
      const pdfPath = await window.api.invoke('sales:generateInvoice', sale.id);
      alert(`Venta completada. Factura: ${pdfPath}`);

      // Limpiar
      setCart([]);
      setPayments([]);
      setShowPaymentModal(false);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Columna izquierda - Productos y búsqueda */}
      <div className="flex-1 p-4 bg-gray-50">
        <h2 className="text-xl font-bold mb-4">Punto de Venta</h2>
        
        <form onSubmit={handleBarcodeSubmit} className="mb-4">
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Escanear código de barras o buscar..."
            className="w-full p-3 border rounded"
            autoFocus
          />
        </form>

        <div className="bg-white rounded shadow p-4">
          <h3 className="font-bold mb-3">Carrito ({cart.length})</h3>
          {cart.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Carrito vacío</p>
          ) : (
            <div className="space-y-2">
              {cart.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 border-b">
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-600">${item.unitPrice.toFixed(2)} c/u</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      className="px-2 py-1 bg-gray-200 rounded"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="px-2 py-1 bg-gray-200 rounded"
                    >
                      +
                    </button>
                    <p className="w-24 text-right font-bold">${item.total.toFixed(2)}</p>
                    <button
                      onClick={() => removeItem(index)}
                      className="px-2 py-1 bg-red-500 text-white rounded"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Columna derecha - Totales y pago */}
      <div className="w-96 bg-white p-6 shadow-lg">
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4">Resumen</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${getSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA (19%):</span>
              <span>${getTax().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t pt-2">
              <span>TOTAL:</span>
              <span>${getTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-2">Pagos recibidos</h3>
          {payments.length === 0 ? (
            <p className="text-gray-400 text-sm">Sin pagos</p>
          ) : (
            <div className="space-y-1">
              {payments.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="capitalize">{p.method}:</span>
                  <span>${p.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold border-t pt-1">
                <span>Faltante:</span>
                <span className={getRemaining() > 0 ? 'text-red-600' : 'text-green-600'}>
                  ${getRemaining().toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowPaymentModal(true)}
          disabled={cart.length === 0}
          className="w-full bg-blue-600 text-white p-3 rounded mb-2 hover:bg-blue-700 disabled:bg-gray-400"
        >
          Agregar Pago
        </button>

        <button
          onClick={handleCompleteSale}
          disabled={cart.length === 0 || getRemaining() > 0.01}
          className="w-full bg-green-600 text-white p-3 rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          Completar Venta
        </button>
      </div>

      {/* Modal de pago */}
      {showPaymentModal && (
        <PaymentModal
          remaining={getRemaining()}
          onAddPayment={(payment) => {
            setPayments([...payments, payment]);
            setShowPaymentModal(false);
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}

function PaymentModal({ remaining, onAddPayment, onClose }: any) {
  const [method, setMethod] = useState('efectivo');
  const [amount, setAmount] = useState(remaining.toString());
  const [reference, setReference] = useState('');

  const handleSubmit = () => {
    const amt = parseFloat(amount);
    if (amt <= 0) {
      alert('Monto inválido');
      return;
    }
    onAddPayment({ method, amount: amt, reference: reference || undefined });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Agregar Pago</h2>
        <p className="mb-4">Faltante: <span className="font-bold">${remaining.toFixed(2)}</span></p>

        <div className="mb-4">
          <label className="block mb-2 font-medium">Método de pago:</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="efectivo">Efectivo</option>
            <option value="nequi">Nequi</option>
            <option value="daviplata">Daviplata</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-medium">Monto:</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border p-2 rounded"
            step="0.01"
          />
        </div>

        {method !== 'efectivo' && (
          <div className="mb-4">
            <label className="block mb-2 font-medium">Referencia/Aprobación:</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="Número de transacción"
            />
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            Agregar
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

### `app/renderer/pages/SalesHistory.tsx`
```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function SalesHistory() {
  const [sales, setSales] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    const activeCash = await window.api.invoke('cash:getActive', user?.id);
    if (activeCash) {
      const data = await window.api.invoke('sales:getByCashRegister', activeCash.id);
      setSales(data);
    }
  };

  const handleViewDetails = async (saleId: number) => {
    const sale = await window.api.invoke('sales:getById', saleId);
    setSelectedSale(sale);
  };

  const handlePrintInvoice = async (saleId: number) => {
    const pdfPath = await window.api.invoke('sales:generateInvoice', saleId);
    alert(`Factura generada: ${pdfPath}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Historial de Ventas</h1>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">N° Venta</th>
              <th className="p-3 text-left">Fecha</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-center">Items</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(sale => (
              <tr key={sale.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono">{sale.saleNumber}</td>
                <td className="p-3">{new Date(sale.createdAt).toLocaleString('es-CO')}</td>
                <td className="p-3 text-right font-bold">${sale.total.toFixed(2)}</td>
                <td className="p-3 text-center">{sale.items.length}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    sale.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {sale.status === 'completed' ? 'Completada' : 'Cancelada'}
                  </span>
                </td>
                <td className="p-3 text-center space-x-2">
                  <button
                    onClick={() => handleViewDetails(sale.id)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => handlePrintInvoice(sale.id)}
                    className="text-green-600 hover:underline text-sm"
                  >
                    Factura
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSale && (
        <SaleDetailsModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
}

function SaleDetailsModal({ sale, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-2/3 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Detalles de Venta {sale.saleNumber}</h2>
        
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <p><strong>Fecha:</strong> {new Date(sale.createdAt).toLocaleString('es-CO')}</p>
            <p><strong>Cajero:</strong> {sale.user.fullName}</p>
          </div>
          <div>
            <p><strong>Estado:</strong> {sale.status === 'completed' ? 'Completada' : 'Cancelada'}</p>
          </div>
        </div>

        <h3 className="font-bold mb-2">Productos:</h3>
        <table className="w-full mb-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Producto</th>
              <th className="p-2 text-center">Cant.</th>
              <th className="p-2 text-right">P.Unit</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item: any, i: number) => (
              <tr key={i} className="border-t">
                <td className="p-2">{item.product.name}</td>
                <td className="p-2 text-center">{item.quantity}</td>
                <td className="p-2 text-right">${item.unitPrice.toFixed(2)}</td>
                <td className="p-2 text-right">${item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t pt-4 mb-4">
          <div className="flex justify-end space-y-1 flex-col">
            <p className="text-right">Subtotal: ${sale.subtotal.toFixed(2)}</p>
            <p className="text-right">IVA: ${sale.tax.toFixed(2)}</p>
            <p className="text-right font-bold text-lg">TOTAL: ${sale.total.toFixed(2)}</p>
          </div>
        </div>

        <h3 className="font-bold mb-2">Pagos:</h3>
        <ul className="mb-4">
          {sale.payments.map((p: any, i: number) => (
            <li key={i} className="mb-1">
              <span className="capitalize">{p.method}</span>: ${p.amount.toFixed(2)}
              {p.reference && <span className="text-gray-600 text-sm ml-2">(Ref: {p.reference})</span>}
            </li>
          ))}
        </ul>

        <button
          onClick={onClose}
          className="w-full bg-gray-300 p-2 rounded hover:bg-gray-400"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
```

---

## 4. DEPENDENCIAS
```bash
npm install pdfkit
npm install -D @types/pdfkit
```

---

## CHECKLIST FASE 4

- [ ] Esquema Prisma con Sale, SaleItem, Payment
- [ ] salesService: crear venta, cancelar, reportes
- [ ] invoiceService: generar PDF con pdfkit
- [ ] IPC handlers registrados
- [ ] Página POS con carrito funcional
- [ ] Modal de pagos mixtos
- [ ] Generación de factura PDF
- [ ] Página SalesHistory con detalles
- [ ] Validación de stock antes de venta
- [ ] Descuento automático de inventario
- [ ] Actualización de expectedCash en caja
- [ ] Probar: venta completa → pago mixto → factura PDF

---

**SIGUIENTE**: Fase 5 - Hardware (escáner código de barras + impresora térmica)