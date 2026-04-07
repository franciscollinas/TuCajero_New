import { Prisma } from '@prisma/client';

import type {
  CartItemInput,
  DailySummary,
  PaymentInput,
  PaymentMethod,
  SaleRecord,
} from '../../renderer/src/shared/types/sales.types';
import { prisma } from '../repositories/prisma';
import { AppError, ErrorCode } from '../utils/errors';
import { AuditService } from './audit.service';

const auditService = new AuditService();

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
  };
}>;

function toNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : Number(value);
}

function mapPaymentMethod(method: string): PaymentMethod {
  const allowed: PaymentMethod[] = ['efectivo', 'nequi', 'daviplata', 'tarjeta', 'transferencia'];
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
    total: Number(sale.total),
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

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: items.map((item) => item.productId),
        },
      },
      include: {
        category: true,
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    let subtotal = 0;
    let tax = 0;

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product || !product.isActive) {
        throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, `Producto ${item.productId} no encontrado.`);
      }

      if (product.expiryDate && product.expiryDate.getTime() < Date.now()) {
        throw new AppError(ErrorCode.PRODUCT_EXPIRED, `"${product.name}" está vencido y no puede venderse.`);
      }

      if (product.stock < item.quantity) {
        throw new AppError(
          ErrorCode.INSUFFICIENT_STOCK,
          `Stock insuficiente para ${product.name}. Disponible: ${product.stock}.`,
        );
      }

      const lineSubtotal = item.quantity * item.unitPrice;
      const lineNet = lineSubtotal - item.discount;
      subtotal += lineNet;
      tax += lineNet * Number(product.taxRate);
    }

    const total = subtotal + tax - discount;
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

    if (Math.abs(totalPaid - total) > 0.01) {
      throw new AppError(
        ErrorCode.PAYMENT_MISMATCH,
        `Total pagado (${totalPaid.toFixed(2)}) no coincide con el total (${total.toFixed(2)}).`,
      );
    }

    const saleNumber = await buildSaleNumber();

    const sale = await prisma.$transaction(async (tx) => {
      const createdSale = await tx.sale.create({
        data: {
          saleNumber,
          cashSessionId,
          userId,
          subtotal,
          tax,
          discount,
          total,
          status: 'COMPLETED',
          items: {
            create: items.map((item) => {
              const product = productMap.get(item.productId);
              const lineSubtotal = item.quantity * item.unitPrice;
              return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxRate: product ? Number(product.taxRate) : 0.19,
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
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
          payments: true,
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
          cashSession: true,
        },
      });

      for (const item of items) {
        const product = productMap.get(item.productId);
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

    return mapSale(sale);
  }

  async getSaleById(id: number): Promise<SaleRecord | null> {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        payments: true,
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        cashSession: true,
      },
    });

    return sale ? mapSale(sale) : null;
  }

  async getSaleByNumber(saleNumber: string): Promise<SaleRecord | null> {
    const sale = await prisma.sale.findUnique({
      where: { saleNumber },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        payments: true,
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        cashSession: true,
      },
    });

    return sale ? mapSale(sale) : null;
  }

  async getSalesByCashRegister(cashSessionId: number): Promise<SaleRecord[]> {
    const sales = await prisma.sale.findMany({
      where: { cashSessionId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        payments: true,
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        cashSession: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sales.map(mapSale);
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<SaleRecord[]> {
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        payments: true,
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        cashSession: true,
      },
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

      for (const item of sale.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

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
                expectedCash: (cashSession.expectedCash ?? cashSession.initialCash).minus(cashAmount),
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
