import { ipcMain } from 'electron';
import { prisma } from '../repositories/prisma';

// Serializar objetos Decimal de Prisma a numeros para IPC
function serializeCustomer(c: any): any {
  return {
    id: c.id,
    document: c.document,
    name: c.name,
    email: c.email,
    phone: c.phone,
    address: c.address,
    isActive: c.isActive,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
    fullName: c.name,
    debts:
      c.debts?.map((d: any) => ({
        id: d.id,
        customerId: d.customerId,
        saleId: d.saleId,
        amount: Number(d.amount),
        balance: Number(d.balance),
        status: d.status,
        createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
        updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
      })) || [],
  };
}

function serializeDebt(d: any): any {
  return {
    id: d.id,
    customerId: d.customerId,
    saleId: d.saleId,
    amount: Number(d.amount),
    balance: Number(d.balance),
    status: d.status,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
    sale: d.sale
      ? {
          id: d.sale.id,
          saleNumber: d.sale.saleNumber,
          total: Number(d.sale.total),
          createdAt:
            d.sale.createdAt instanceof Date ? d.sale.createdAt.toISOString() : d.sale.createdAt,
        }
      : null,
    payments:
      d.payments?.map((p: any) => ({
        id: p.id,
        debtId: p.debtId,
        method: p.method,
        amount: Number(p.amount),
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      })) || [],
  };
}

function serializeSale(s: any): any {
  return {
    ...s,
    subtotal: Number(s.subtotal),
    tax: Number(s.tax),
    discount: Number(s.discount),
    deliveryFee: Number(s.deliveryFee),
    total: Number(s.total),
    items:
      s.items?.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        discount: Number(item.discount),
        total: Number(item.total),
      })) || [],
    payments:
      s.payments?.map((p: any) => ({
        ...p,
        amount: Number(p.amount),
      })) || [],
    debt: s.debt
      ? {
          ...s.debt,
          amount: Number(s.debt.amount),
          balance: Number(s.debt.balance),
        }
      : null,
  };
}

export function registerCustomersIpc(): void {
  ipcMain.handle('customers:search', async (_, query: string) => {
    try {
      if (!query.trim()) {
        const customers = await (prisma as any).customer.findMany({
          take: 50,
          orderBy: { name: 'asc' },
          include: { debts: { where: { status: { not: 'PAID' } } } },
        });
        return { success: true, data: customers.map(serializeCustomer) };
      }
      const customers = await (prisma as any).customer.findMany({
        where: {
          OR: [{ name: { contains: query } }, { document: { contains: query } }],
        },
        take: 50,
        include: { debts: { where: { status: { not: 'PAID' } } } },
      });
      return { success: true, data: customers.map(serializeCustomer) };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  });

  ipcMain.handle('customers:create', async (_, data: any) => {
    try {
      const customer = await (prisma as any).customer.create({
        data: {
          name: data.fullName || data.name,
          document: data.document || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
        },
      });
      return { success: true, data: customer };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  });

  ipcMain.handle('customers:update', async (_, id: number, data: any) => {
    try {
      const customer = await (prisma as any).customer.update({
        where: { id },
        data: {
          name: data.fullName || data.name,
          document: data.document || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
        },
      });
      return { success: true, data: customer };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  });

  ipcMain.handle('customers:getHistory', async (_, id: number) => {
    try {
      const sales = await (prisma as any).sale.findMany({
        where: { customerId: id },
        include: {
          items: { include: { product: true } },
          payments: true,
          debt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return { success: true, data: sales.map(serializeSale) };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  });

  ipcMain.handle('customers:getDebts', async (_, id: number) => {
    try {
      const debts = await (prisma as any).debt.findMany({
        where: { customerId: id, status: { not: 'PAID' } },
        include: { payments: true },
        orderBy: { createdAt: 'asc' },
      });
      const serialized = debts.map((d: any) => ({
        id: d.id,
        customerId: d.customerId,
        saleId: d.saleId,
        amount: Number(d.amount),
        balance: Number(d.balance),
        status: d.status,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
        updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
        payments: d.payments
          ? d.payments.map((p: any) => ({
              id: p.id,
              debtId: p.debtId,
              method: p.method,
              amount: Number(p.amount),
              createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
            }))
          : [],
      }));
      return { success: true, data: serialized };
    } catch (error) {
      return {
        success: false,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  });

  ipcMain.handle(
    'customers:payDebt',
    async (_, debtId: number, amount: number, method: string, cashSessionId?: number) => {
      try {
        const result = await prisma.$transaction(async (tx: any) => {
          const debt = await tx.debt.findUnique({ where: { id: debtId } });
          if (!debt) throw new Error('Deuda no encontrada');
          const amountD = Number(amount);
          const balanceD = Number(debt.balance);
          if (amountD > balanceD) throw new Error('El monto es mayor al saldo pendiente');

          const newBalance = balanceD - amountD;
          const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

          await tx.payment.create({
            data: {
              debtId,
              method,
              amount: amountD,
              cashSessionId: cashSessionId || null,
            },
          });

          const updatedDebt = await tx.debt.update({
            where: { id: debtId },
            data: {
              balance: newBalance,
              status: newStatus,
            },
          });
          return updatedDebt;
        });
        return { success: true, data: serializeDebt(result) };
      } catch (error) {
        return {
          success: false,
          error: { message: error instanceof Error ? error.message : String(error) },
        };
      }
    },
  );
}
