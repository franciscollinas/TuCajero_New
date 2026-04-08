import { ipcMain } from 'electron';
import { prisma } from '../repositories/prisma';

export function registerCustomersIpc(): void {
  ipcMain.handle('customers:search', async (_, query: string) => {
    try {
      if (!query.trim()) {
        const customers = await (prisma as any).customer.findMany({ take: 50, orderBy: { name: 'asc' } });
        return { success: true, data: customers.map((c: any) => ({ ...c, fullName: c.name })) };
      }
      const customers = await (prisma as any).customer.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { document: { contains: query } },
          ],
        },
        take: 50,
      });
      return { success: true, data: customers.map((c: any) => ({ ...c, fullName: c.name })) };
    } catch (error) {
      return { success: false, error: { message: error instanceof Error ? error.message : String(error) } };
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
      return { success: false, error: { message: error instanceof Error ? error.message : String(error) } };
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
      return { success: false, error: { message: error instanceof Error ? error.message : String(error) } };
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
      return { success: true, data: sales };
    } catch (error) {
      return { success: false, error: { message: error instanceof Error ? error.message : String(error) } };
    }
  });

  ipcMain.handle('customers:getDebts', async (_, id: number) => {
    try {
      const debts = await (prisma as any).debt.findMany({
        where: { customerId: id, status: { not: 'PAID' } },
        include: { payments: true, sale: true },
        orderBy: { createdAt: 'asc' },
      });
      return { success: true, data: debts };
    } catch (error) {
      return { success: false, error: { message: error instanceof Error ? error.message : String(error) } };
    }
  });

  ipcMain.handle('customers:payDebt', async (_, debtId: number, amount: number, method: string, cashSessionId?: number) => {
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
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: { message: error instanceof Error ? error.message : String(error) } };
    }
  });
}
