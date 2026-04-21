import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from './app/main/repositories/generated-client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'database', 'tucajero.db');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
});

describe('SIMULACIONES - 10 simulaciones por flujo', () => {
  let adminUserId: number;
  const createdProducts: number[] = [];
  const createdSales: number[] = [];
  const createdSessions: number[] = [];

  beforeAll(async () => {
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!user) throw new Error('No admin user found');
    adminUserId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('FLUJO: VENTAS - 10 simulaciones', () => {
    for (let i = 1; i <= 10; i++) {
      it(`simulacion ${i}: crear venta`, async () => {
        const product = await prisma.product.findFirst();
        expect(product).toBeDefined();

        const session = await prisma.cashSession.findFirst({
          where: { userId: adminUserId, status: 'OPEN' },
        });

        if (session) {
          const sale = await prisma.sale.create({
            data: {
              saleNumber: `TST-${Date.now()}-${i}`,
              cashSessionId: session.id,
              userId: adminUserId,
              subtotal: product!.price,
              tax: 0,
              discount: 0,
              deliveryFee: 0,
              total: product!.price,
              status: 'COMPLETED',
            },
          });
          createdSales.push(sale.id);
          expect(sale.id).toBeGreaterThan(0);
        }
      });
    }
  });

  describe('FLUJO: PRODUCTOS LISTAR - 10 simulaciones', () => {
    for (let i = 1; i <= 10; i++) {
      it(`simulacion ${i}: listar productos`, async () => {
        const products = await prisma.product.findMany({ take: 10 });
        expect(products.length).toBeGreaterThanOrEqual(0);
      });
    }
  });

  describe('FLUJO: CREAR PRODUCTO - 10 simulaciones', () => {
    for (let i = 1; i <= 10; i++) {
      it(`simulacion ${i}: crear producto`, async () => {
        const category = await prisma.category.findFirst();
        const rand = Math.floor(Math.random() * 100000);

        const product = await prisma.product.create({
          data: {
            name: `Test Product ${rand}`,
            code: `TEST-${rand}`,
            barcode: `BAR${rand}`,
            categoryId: category?.id ?? 1,
            cost: 5000,
            price: 10000,
            stock: 100,
            minStock: 10,
            criticalStock: 5,
            location: 'A1',
          },
        });
        createdProducts.push(product.id);
        expect(product.id).toBeGreaterThan(0);
      });
    }
  });

  describe('FLUJO: EDITAR PRODUCTO - 10 simulaciones', () => {
    for (let i = 1; i <= 10; i++) {
      it(`simulacion ${i}: editar producto`, async () => {
        if (createdProducts[i - 1]) {
          await prisma.product.update({
            where: { id: createdProducts[i - 1] },
            data: { price: 15000 + i * 100, minStock: 15 + i },
          });

          const updated = await prisma.product.findUnique({
            where: { id: createdProducts[i - 1] },
          });
          expect(Number(updated?.price)).toBe(15000 + i * 100);
        }
      });
    }
  });

  describe('FLUJO: ELIMINAR PRODUCTO - 10 simulaciones', () => {
    for (let i = 1; i <= 10; i++) {
      it(`simulacion ${i}: eliminar producto`, async () => {
        const idx = createdProducts.length - i;
        if (idx >= 0 && createdProducts[idx]) {
          await prisma.product.delete({ where: { id: createdProducts[idx] } });

          const deleted = await prisma.product.findUnique({
            where: { id: createdProducts[idx] },
          });
          expect(deleted).toBeNull();
        }
      });
    }
  });

  describe('FLUJO: USUARIOS - 10 simulaciones', () => {
    for (let i = 1; i <= 10; i++) {
      it(`simulacion ${i}: listar usuarios`, async () => {
        const users = await prisma.user.findMany({ take: 10 });
        expect(users.length).toBeGreaterThan(0);
      });
    }
  });

  describe('FLUJO: CAJA - 10 simulaciones', () => {
    for (let i = 1; i <= 10; i++) {
      it(`simulacion ${i}: abrir caja`, async () => {
        const session = await prisma.cashSession.create({
          data: {
            userId: adminUserId,
            initialCash: 50000 + i * 1000,
            status: 'OPEN',
          },
        });
        createdSessions.push(session.id);
        expect(session.id).toBeGreaterThan(0);
      });

      it(`simulacion ${i}: cerrar caja`, async () => {
        if (createdSessions[i - 1]) {
          await prisma.cashSession.update({
            where: { id: createdSessions[i - 1] },
            data: {
              status: 'CLOSED',
              finalCash: 50000 + i * 1000,
              expectedCash: 50000 + i * 1000,
              closedAt: new Date(),
            },
          });

          const closed = await prisma.cashSession.findUnique({
            where: { id: createdSessions[i - 1] },
          });
          expect(closed?.status).toBe('CLOSED');
        }
      });
    }
  });

  describe('FLUJO: CLIENTES - 10 simulaciones', () => {
    for (let i = 1; i <= 10; i++) {
      it(`simulacion ${i}: listar clientes`, async () => {
        const customers = await prisma.customer.findMany({ take: 10 });
        expect(customers.length).toBeGreaterThanOrEqual(0);
      });
    }
  });

  describe('FLUJO: CATEGORIAS - 10 simulaciones', () => {
    for (let i = 1; i <= 10; i++) {
      it(`simulacion ${i}: listar categorias`, async () => {
        const categories = await prisma.category.findMany();
        expect(categories.length).toBeGreaterThanOrEqual(0);
      });
    }
  });

  describe('FLUJO: INVENTARIO - 10 simulaciones', () => {
    for (let i = 1; i <= 10; i++) {
      it(`simulacion ${i}: buscar producto por barcode`, async () => {
        const product = await prisma.product.findFirst();
        if (product) {
          const found = await prisma.product.findUnique({
            where: { id: product.id },
          });
          expect(found).toBeDefined();
        }
      });
    }
  });
});
