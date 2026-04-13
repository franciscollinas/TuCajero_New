import { ipcMain } from 'electron';

import type { ApiResponse } from '../../renderer/src/shared/types/api.types';
import { prisma } from '../repositories/prisma';
import { toApiError } from '../utils/errors';
import { logger } from '../utils/logger';

// ─── Serialization helpers ───────────────────────────────────────────

interface PrismaDecimalLike {
  toNumber: () => number;
}

function safeNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof (value as PrismaDecimalLike).toNumber === 'function') {
    return (value as PrismaDecimalLike).toNumber();
  }
  return Number(value);
}

function safeDate(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return new Date(value).toISOString();
  return null;
}

interface CustomerDebtRecord {
  id: number;
  customerId: number;
  saleId: number;
  amount: unknown;
  balance: unknown;
  status: string;
  createdAt: unknown;
  updatedAt: unknown;
}

interface CustomerRecord {
  id: number;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

interface SerializedCustomer {
  id: number;
  document: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  fullName: string;
  debts: SerializedDebt[];
}

interface SerializedSaleDebtRef {
  id: number;
  saleNumber: string;
  total: number;
  createdAt: string | null;
}

interface SerializedDebt {
  id: number;
  customerId: number;
  saleId: number;
  amount: number;
  balance: number;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  sale: SerializedSaleDebtRef | null;
  payments: SerializedDebtPayment[];
}

interface SerializedDebtPayment {
  id: number;
  debtId: number;
  method: string;
  amount: number;
  createdAt: string | null;
}

interface SerializedSale {
  id: number;
  saleNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  deliveryFee: number;
  total: number;
  createdAt: string | null;
  items: SerializedSaleItem[];
  payments: SerializedSalePayment[];
  debt: SerializedSaleDebt | null;
}

interface SerializedSaleItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  total: number;
  product: { id: number; name: string; code: string };
}

interface SerializedSalePayment {
  id: number;
  method: string;
  amount: number;
  createdAt: string | null;
}

interface SerializedSaleDebt {
  id: number;
  amount: number;
  balance: number;
  status: string;
}

function serializeCustomer(c: CustomerRecord & { debts?: CustomerDebtRecord[] }): SerializedCustomer {
  return {
    id: c.id,
    document: c.document,
    name: c.name,
    email: c.email,
    phone: c.phone,
    address: c.address,
    isActive: c.isActive,
    createdAt: safeDate(c.createdAt),
    updatedAt: safeDate(c.updatedAt),
    fullName: c.name,
    debts:
      c.debts?.map((d) => ({
        id: d.id,
        customerId: d.customerId,
        saleId: d.saleId,
        amount: safeNumber(d.amount),
        balance: safeNumber(d.balance),
        status: d.status,
        createdAt: safeDate(d.createdAt),
        updatedAt: safeDate(d.updatedAt),
        sale: null,
        payments: [],
      })) ?? [],
  };
}

function serializeDebt(
  d: CustomerDebtRecord & {
    sale?: { id: number; saleNumber: string; total: unknown; createdAt: unknown };
    payments?: { id: number; debtId: number; method: string; amount: unknown; createdAt: unknown }[];
  },
): SerializedDebt {
  return {
    id: d.id,
    customerId: d.customerId,
    saleId: d.saleId,
    amount: safeNumber(d.amount),
    balance: safeNumber(d.balance),
    status: d.status,
    createdAt: safeDate(d.createdAt),
    updatedAt: safeDate(d.updatedAt),
    sale: d.sale
      ? {
          id: d.sale.id,
          saleNumber: d.sale.saleNumber,
          total: safeNumber(d.sale.total),
          createdAt: safeDate(d.sale.createdAt),
        }
      : null,
    payments:
      d.payments?.map((p) => ({
        id: p.id,
        debtId: p.debtId,
        method: p.method,
        amount: safeNumber(p.amount),
        createdAt: safeDate(p.createdAt),
      })) ?? [],
  };
}

function serializeSale(s: {
  id: number;
  saleNumber: string;
  subtotal: unknown;
  tax: unknown;
  discount: unknown;
  deliveryFee: unknown;
  total: unknown;
  createdAt: unknown;
  items?: {
    id: number;
    productId: number;
    quantity: unknown;
    unitPrice: unknown;
    subtotal: unknown;
    discount: unknown;
    total: unknown;
    product: { id: number; name: string; code: string };
  }[];
  payments?: { id: number; method: string; amount: unknown; createdAt: unknown }[];
  debt?: { amount: unknown; balance: unknown; status: string };
}): SerializedSale {
  return {
    id: s.id,
    saleNumber: s.saleNumber,
    subtotal: safeNumber(s.subtotal),
    tax: safeNumber(s.tax),
    discount: safeNumber(s.discount),
    deliveryFee: safeNumber(s.deliveryFee),
    total: safeNumber(s.total),
    createdAt: safeDate(s.createdAt),
    items:
      s.items?.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: safeNumber(item.quantity),
        unitPrice: safeNumber(item.unitPrice),
        subtotal: safeNumber(item.subtotal),
        discount: safeNumber(item.discount),
        total: safeNumber(item.total),
        product: item.product,
      })) ?? [],
    payments:
      s.payments?.map((p) => ({
        id: p.id,
        method: p.method,
        amount: safeNumber(p.amount),
        createdAt: safeDate(p.createdAt),
      })) ?? [],
    debt: s.debt
      ? {
          id: -1,
          amount: safeNumber(s.debt.amount),
          balance: safeNumber(s.debt.balance),
          status: s.debt.status,
        }
      : null,
  };
}

// ─── IPC Registration ────────────────────────────────────────────────

export function registerCustomersIpc(): void {
  ipcMain.handle(
    'customers:search',
    async (_event, query: string): Promise<ApiResponse<SerializedCustomer[]>> => {
      try {
        const customers = await prisma.customer.findMany({
          where: query.trim()
            ? {
                OR: [{ name: { contains: query } }, { document: { contains: query } }],
              }
            : undefined,
          take: 50,
          orderBy: { name: 'asc' },
          include: { debts: { where: { status: { not: 'PAID' } } } },
        });
        return { success: true, data: (customers as unknown as (CustomerRecord & { debts?: CustomerDebtRecord[] })[]).map(serializeCustomer) };
      } catch (err) {
        logger.error('customers:search-error', { err, query });
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'customers:create',
    async (
      _,
      data: { fullName?: string; name?: string; document?: string; email?: string; phone?: string; address?: string },
    ): Promise<ApiResponse<CustomerRecord>> => {
      try {
        const customer = await prisma.customer.create({
          data: {
            name: data.fullName || data.name || '',
            document: data.document || null,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
          },
        });
        logger.info('customers:create-success', { customerId: customer.id });
        return { success: true, data: customer };
      } catch (err) {
        logger.error('customers:create-error', { err });
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'customers:update',
    async (
      _,
      id: number,
      data: { fullName?: string; name?: string; document?: string; email?: string; phone?: string; address?: string },
    ): Promise<ApiResponse<CustomerRecord>> => {
      try {
        const customer = await prisma.customer.update({
          where: { id },
          data: {
            name: data.fullName || data.name || '',
            document: data.document || null,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
          },
        });
        logger.info('customers:update-success', { customerId: id });
        return { success: true, data: customer };
      } catch (err) {
        logger.error('customers:update-error', { err, customerId: id });
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'customers:getHistory',
    async (_event, id: number): Promise<ApiResponse<SerializedSale[]>> => {
      try {
        const sales = await prisma.sale.findMany({
          where: { customerId: id },
          include: {
            items: { include: { product: { select: { id: true, name: true, code: true } } } },
            payments: true,
            debt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        return { success: true, data: (sales as unknown as Parameters<typeof serializeSale>[0][]).map(serializeSale) };
      } catch (err) {
        logger.error('customers:getHistory-error', { err, customerId: id });
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'customers:getDebts',
    async (_event, id: number): Promise<ApiResponse<SerializedDebt[]>> => {
      try {
        const debts = await prisma.debt.findMany({
          where: { customerId: id, status: { not: 'PAID' } },
          include: { payments: true },
          orderBy: { createdAt: 'asc' },
        });
        const serialized = debts.map((d) => serializeDebt(d as Parameters<typeof serializeDebt>[0]));
        return { success: true, data: serialized };
      } catch (err) {
        logger.error('customers:getDebts-error', { err, customerId: id });
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'customers:payDebt',
    async (
      _,
      debtId: number,
      amount: number,
      method: string,
      cashSessionId?: number,
    ): Promise<ApiResponse<SerializedDebt>> => {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const debt = await tx.debt.findUnique({ where: { id: debtId } });
          if (!debt) throw new Error('Deuda no encontrada');

          const amountD = Number(amount);
          const balanceD = safeNumber(debt.balance);
          if (amountD > balanceD) throw new Error('El monto es mayor al saldo pendiente');

          const newBalance = balanceD - amountD;
          const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

          await tx.payment.create({
            data: {
              debtId,
              method,
              amount: amountD,
              cashSessionId: cashSessionId ?? null,
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

        logger.info('customers:payDebt-success', { debtId, amount, method });
        return { success: true, data: serializeDebt(result as Parameters<typeof serializeDebt>[0]) };
      } catch (err) {
        logger.error('customers:payDebt-error', { err, debtId });
        return { success: false, error: toApiError(err) };
      }
    },
  );
}
