import { Prisma } from '../../../database/generated-client';

import type {
  CartItemInput,
  DailySummary,
  DashboardSummary,
  PaymentInput,
  PaymentMethod,
  SaleRecord,
} from '../../renderer/src/shared/types/sales.types';
import { prisma } from '../repositories/prisma';
import { AppError, ErrorCode } from '../utils/errors';
import { toNumber } from '../utils/prisma-helpers';
import { AuditService } from './audit.service';
import { ConfigService } from './config.service';

const auditService = new AuditService();
const configService = new ConfigService();

const SALE_INCLUDE = {
  items: { include: { product: { include: { category: true } } } },
  payments: true,
  user: { select: { id: true, fullName: true, username: true } },
  cashSession: true,
  customer: true,
  debt: true,
} as const;

type SaleWithRelations = Prisma.SaleGetPayload<{
  include: {
    items: {
      include: {
        product: {
          include: {
            category: true;
          };
        };
      };
    };
    payments: true;
    user: {
      select: {
        id: true;
        username: true;
        fullName: true;
      };
    };
    cashSession: true;
    customer: true;
  };
}>;

function mapPaymentMethod(method: string): PaymentMethod {
  const allowed: PaymentMethod[] = [
    'efectivo',
    'nequi',
    'daviplata',
    'tarjeta',
    'transferencia',
    'credito',
  ];
  return allowed.includes(method as PaymentMethod) ? (method as PaymentMethod) : 'transferencia';
}

function mapSale(sale: SaleWithRelations): SaleRecord {
  return {
    id: sale.id,
    saleNumber: sale.saleNumber,
    cashSessionId: sale.cashSessionId,
    userId: sale.userId,
    subtotal: Number(sale.subtotal),
    tax: Number(sale.tax),
    discount: Number(sale.discount),
    deliveryFee: Number(sale.deliveryFee),
    total: Number(sale.total),
    customerId: sale.customerId,
    customer: sale.customer
      ? {
          id: sale.customer.id,
          name: sale.customer.name,
          phone: sale.customer.phone,
        }
      : null,
    status: sale.status,
    createdAt: sale.createdAt.toISOString(),
    items: sale.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      subtotal: Number(item.subtotal),
      discount: Number(item.discount),
      total: Number(item.total),
      unitType: item.unitType,
      product: {
        id: item.product.id,
        code: item.product.code,
        barcode: item.product.barcode,
        name: item.product.name,
        categoryName: item.product.category.name,
      },
    })),
    payments: sale.payments.map((payment) => ({
      id: payment.id,
      method: mapPaymentMethod(payment.method),
      amount: Number(payment.amount),
      reference: payment.reference,
      createdAt: payment.createdAt.toISOString(),
    })),
    user: {
      id: sale.user.id,
      username: sale.user.username,
      fullName: sale.user.fullName,
    },
    cashSession: sale.cashSession
      ? {
          id: sale.cashSession.id,
          initialCash: Number(sale.cashSession.initialCash),
          expectedCash: toNumber(sale.cashSession.expectedCash),
          openedAt: sale.cashSession.openedAt.toISOString(),
          closedAt: sale.cashSession.closedAt ? sale.cashSession.closedAt.toISOString() : null,
          status: sale.cashSession.status,
        }
      : null,
  };
}

async function buildSaleNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `V-${year}-`;
  const lastSale = await prisma.sale.findFirst({
    where: {
      saleNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      saleNumber: 'desc',
    },
  });

  const nextNumber = lastSale ? Number(lastSale.saleNumber.split('-')[2]) + 1 : 1;
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

export class SalesService {
  async createSale(
    cashSessionId: number,
    userId: number,
    items: CartItemInput[],
    payments: PaymentInput[],
    discount = 0,
    deliveryFee = 0,
    customerId?: number,
  ): Promise<SaleRecord> {
    if (items.length === 0) {
      throw new AppError(ErrorCode.EMPTY_CART, 'El carrito está vacío.');
    }

    if (payments.length === 0) {
      throw new AppError(ErrorCode.PAYMENT_MISMATCH, 'Debes registrar al menos un pago.');
    }

    const cashSession = await prisma.cashSession.findUnique({
      where: { id: cashSessionId },
    });

    if (!cashSession || cashSession.status !== 'OPEN') {
      throw new AppError(ErrorCode.NO_OPEN_SESSION, 'Debes abrir una caja antes de vender.');
    }

    const defaultTaxRate = await configService.getIvaRate();

    let subtotal = 0;
    let tax = 0;

    // Fetch products to calculate totals (read-only, validation happens inside transaction)
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((item) => item.productId) } },
      include: { category: true },
    });

    const productMap = new Map<number, any>(products.map((product: any) => [product.id, product]));

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        // Will be caught inside transaction; fail early for calculation purposes
        throw new AppError(
          ErrorCode.PRODUCT_NOT_FOUND,
          `Producto ${item.productId} no encontrado.`,
        );
      }
      const rate =
        product.taxRate !== null && product.taxRate !== undefined
          ? Number(product.taxRate)
          : defaultTaxRate;
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineNet = lineSubtotal - item.discount;
      subtotal += lineNet;
      tax += lineNet * rate;
    }

    const finalDiscount = discount <= 100 ? (subtotal * discount) / 100 : discount;
    const total = subtotal + tax + deliveryFee - finalDiscount;
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

    if (Math.abs(totalPaid - total) > 0.01) {
      throw new AppError(
        ErrorCode.PAYMENT_MISMATCH,
        `Total pagado (${totalPaid.toFixed(2)}) no coincide con el total (${total.toFixed(2)}).`,
      );
    }

    const saleNumber = await buildSaleNumber();

    const sale = await prisma.$transaction(async (tx) => {
      // Re-fetch products INSIDE the transaction to prevent race conditions
      const txProducts = await tx.product.findMany({
        where: { id: { in: items.map((item) => item.productId) } },
        include: { category: true },
      });

      const txProductMap = new Map<number, any>(
        txProducts.map((product: any) => [product.id, product]),
      );

      // Validate stock INSIDE transaction
      for (const item of items) {
        const product = txProductMap.get(item.productId);

        if (!product || !product.isActive) {
          throw new AppError(
            ErrorCode.PRODUCT_NOT_FOUND,
            `Producto ${item.productId} no encontrado.`,
          );
        }

        if (product.expiryDate && product.expiryDate.getTime() < Date.now()) {
          throw new AppError(
            ErrorCode.PRODUCT_EXPIRED,
            `"${product.name}" está vencido y no puede venderse.`,
          );
        }

        if (product.stock < item.quantity) {
          throw new AppError(
            ErrorCode.INSUFFICIENT_STOCK,
            `Stock insuficiente para ${product.name}. Disponible: ${product.stock}.`,
          );
        }
      }

      const creditPayment = payments.find((p) => p.method === 'credito');
      if (creditPayment && !customerId) {
        throw new AppError(
          ErrorCode.VALIDATION,
          'Se requiere seleccionar un cliente para ventas a crédito (fiado).',
        );
      }

      const createdSale = await tx.sale.create({
        data: {
          saleNumber,
          cashSessionId,
          userId,
          subtotal,
          tax,
          discount,
          deliveryFee,
          total,
          status: 'COMPLETED',
          customerId: customerId || null,
          items: {
            create: items.map((item) => {
              const product = txProductMap.get(item.productId);
              const lineSubtotal = item.quantity * item.unitPrice;
              return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxRate: product ? Number(product.taxRate) : defaultTaxRate,
                subtotal: lineSubtotal,
                discount: item.discount,
                total: lineSubtotal - item.discount,
                unitType: product?.unitType ?? 'UNIT',
              };
            }),
          },
          payments: {
            create: payments.map((payment) => ({
              method: payment.method,
              amount: payment.amount,
              reference: payment.reference ?? null,
              cashSessionId,
            })),
          },
        },
        include: SALE_INCLUDE,
      });

      if (creditPayment && customerId) {
        await tx.debt.create({
          data: {
            customerId,
            saleId: createdSale.id,
            amount: creditPayment.amount,
            balance: creditPayment.amount,
            status: 'PENDING',
          },
        });
      }

      for (const item of items) {
        const product = txProductMap.get(item.productId);
        if (!product) {
          continue;
        }

        const newStock = product.stock - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'venta',
            quantity: item.quantity,
            previousStock: product.stock,
            newStock,
            reason: `Venta ${saleNumber}`,
            userId,
          },
        });
      }

      const cashPayment = payments
        .filter((payment) => payment.method === 'efectivo')
        .reduce((sum, payment) => sum + payment.amount, 0);

      if (cashPayment > 0) {
        await tx.cashSession.update({
          where: { id: cashSessionId },
          data: {
            expectedCash: (cashSession.expectedCash ?? cashSession.initialCash).plus(cashPayment),
          },
        });
      }

      return createdSale;
    });

    await auditService.log({
      userId,
      action: 'sale:created',
      entity: 'Sale',
      entityId: sale.id,
      payload: {
        saleNumber: sale.saleNumber,
        total: Number(sale.total),
        items: sale.items.length,
        payments: sale.payments.map((payment) => ({
          method: payment.method,
          amount: Number(payment.amount),
        })),
      },
    });

    return mapSale(sale as unknown as SaleWithRelations);
  }

  async getSaleById(id: number): Promise<SaleRecord | null> {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: SALE_INCLUDE,
    });

    return sale ? mapSale(sale as unknown as SaleWithRelations) : null;
  }

  async getSaleByNumber(saleNumber: string): Promise<SaleRecord | null> {
    const sale = await prisma.sale.findUnique({
      where: { saleNumber },
      include: SALE_INCLUDE,
    });

    return sale ? mapSale(sale as unknown as SaleWithRelations) : null;
  }

  async getSalesByCashRegister(cashSessionId: number): Promise<SaleRecord[]> {
    const sales = await prisma.sale.findMany({
      where: { cashSessionId },
      include: SALE_INCLUDE,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sales.map((s) => mapSale(s as unknown as SaleWithRelations));
  }

  async getSalesByUser(userId: number): Promise<SaleRecord[]> {
    const sales = await prisma.sale.findMany({
      where: { userId },
      include: SALE_INCLUDE,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sales.map((s) => mapSale(s as unknown as SaleWithRelations));
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<SaleRecord[]> {
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: SALE_INCLUDE,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sales.map(mapSale);
  }

  async cancelSale(id: number, userId: number): Promise<{ success: true }> {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!sale) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Venta no encontrada.');
    }

    if (sale.status === 'CANCELLED') {
      throw new AppError(ErrorCode.VALIDATION, 'La venta ya fue cancelada.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // Batch fetch all products to prevent N+1
      const productIds = sale.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map<number, any>(products.map((p: any) => [p.id, p]));

      for (const item of sale.items) {
        const product = productMap.get(item.productId);

        if (!product) {
          continue;
        }

        const restoredStock = product.stock + Number(item.quantity);

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: restoredStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'ajuste',
            quantity: Number(item.quantity),
            previousStock: product.stock,
            newStock: restoredStock,
            reason: `Cancelación venta ${sale.saleNumber}`,
            userId,
          },
        });
      }

      if (sale.cashSessionId) {
        const cashAmount = sale.payments
          .filter((payment) => payment.method === 'efectivo')
          .reduce((sum, payment) => sum + Number(payment.amount), 0);

        if (cashAmount > 0) {
          const cashSession = await tx.cashSession.findUnique({
            where: { id: sale.cashSessionId },
          });

          if (cashSession) {
            await tx.cashSession.update({
              where: { id: sale.cashSessionId },
              data: {
                expectedCash: (cashSession.expectedCash ?? cashSession.initialCash).minus(
                  cashAmount,
                ),
              },
            });
          }
        }
      }
    });

    await auditService.log({
      userId,
      action: 'sale:cancelled',
      entity: 'Sale',
      entityId: sale.id,
      payload: {
        saleNumber: sale.saleNumber,
        total: Number(sale.total),
      },
    });

    return { success: true };
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const now = new Date();

    // Build "today" range using local timezone components to avoid UTC drift
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const today = new Date(year, month, day, 0, 0, 0, 0);
    const endOfToday = new Date(year, month, day, 23, 59, 59, 999);

    const startOf7Days = new Date(year, month, day - 6, 0, 0, 0, 0);

    // Run basic metrics in parallel to eliminate sequential bottlenecks
    const [todaySales, allRecentSales, categoryGroups, recent] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          createdAt: { gte: today, lte: endOfToday },
          status: 'COMPLETED',
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.sale.findMany({
        where: {
          createdAt: { gte: startOf7Days },
          status: 'COMPLETED',
        },
        select: {
          total: true,
          createdAt: true,
        },
      }),
      prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: {
            status: 'COMPLETED',
            createdAt: { gte: startOf7Days },
          },
        },
        _sum: { total: true },
      }),
      prisma.sale.findMany({
        take: 10,
        where: { debt: null },
        orderBy: { createdAt: 'desc' },
        include: SALE_INCLUDE,
      }),
    ]);

    // 1. Weekly Chart Processing
    const weeklyBuckets: Record<string, { ventas: number; ingresos: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(year, month, day - i);
      const name = d.toLocaleDateString('es-CO', { weekday: 'short' });
      weeklyBuckets[name] = { ventas: 0, ingresos: 0 };
    }

    allRecentSales.forEach((s) => {
      const name = s.createdAt.toLocaleDateString('es-CO', { weekday: 'short' });
      if (weeklyBuckets[name]) {
        weeklyBuckets[name].ventas++;
        weeklyBuckets[name].ingresos += Number(s.total);
      }
    });

    const weeklyChart = Object.keys(weeklyBuckets).map((name) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      ...weeklyBuckets[name],
    }));

    // 2. Top Categories Mapping - Minified Fetch
    const productIds = categoryGroups.map((g) => g.productId);
    const productsInSales =
      productIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, category: { select: { name: true } } },
          })
        : [];

    const categoryPerformance: Record<string, number> = {};
    categoryGroups.forEach((g) => {
      const p = productsInSales.find((item) => item.id === g.productId);
      if (p && p.category) {
        categoryPerformance[p.category.name] =
          (categoryPerformance[p.category.name] || 0) + Number(g._sum.total || 0);
      }
    });

    const topCategories = Object.entries(categoryPerformance)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      today: {
        totalVendidos: todaySales._count.id,
        totalMonto: Number(todaySales._sum.total ?? 0),
      },
      weeklyChart,
      topCategories,
      recentSales: recent.map(mapSale),
    };
  }

  async getDailySummary(cashSessionId: number): Promise<DailySummary> {
    const sales = await this.getSalesByCashRegister(cashSessionId);
    const completed = sales.filter((sale) => sale.status === 'COMPLETED');

    return {
      totalSales: completed.length,
      totalAmount: completed.reduce((sum, sale) => sum + sale.total, 0),
      paymentsByMethod: completed.reduce<Record<string, number>>((acc, sale) => {
        sale.payments.forEach((payment) => {
          acc[payment.method] = (acc[payment.method] ?? 0) + payment.amount;
        });
        return acc;
      }, {}),
      sales: completed,
    };
  }
}
