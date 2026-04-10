import { Prisma } from '@prisma/client';

import type { CashCloseSummary, CashRegister } from '../../renderer/src/shared/types/cash.types';
import { prisma } from '../repositories/prisma';
import { AppError, ErrorCode } from '../utils/errors';
import { AuditService } from './audit.service';

const auditService = new AuditService();

function toNumber(value: Prisma.Decimal | null): number | null {
  return value ? Number(value) : null;
}

function mapCashSession(session: {
  id: number;
  userId: number;
  initialCash: Prisma.Decimal;
  finalCash: Prisma.Decimal | null;
  expectedCash: Prisma.Decimal | null;
  difference: Prisma.Decimal | null;
  openedAt: Date;
  closedAt: Date | null;
  status: string;
}): CashRegister {
  return {
    id: session.id,
    userId: session.userId,
    initialCash: Number(session.initialCash),
    finalCash: toNumber(session.finalCash),
    expectedCash: toNumber(session.expectedCash),
    difference: toNumber(session.difference),
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt ? session.closedAt.toISOString() : null,
    status: session.status,
  };
}

export class CashSessionService {
  async openCashSession(userId: number, initialCash: number): Promise<CashRegister> {
    const activeSession = await prisma.cashSession.findFirst({
      where: {
        userId,
        status: 'OPEN',
      },
    });

    if (activeSession) {
      throw new AppError(ErrorCode.SESSION_ALREADY_OPEN, 'Ya tienes una caja abierta.');
    }

    const session = await prisma.cashSession.create({
      data: {
        userId,
        initialCash,
        status: 'OPEN',
      },
    });

    await auditService.log({
      userId,
      action: 'cash-session:opened',
      entity: 'CashSession',
      entityId: session.id,
      payload: {
        initialCash,
      },
    });

    return mapCashSession(session);
  }

  async closeCashSession(
    sessionId: number,
    finalCash: number,
    expectedCash: number,
  ): Promise<CashCloseSummary> {
    const session = await prisma.cashSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== 'OPEN') {
      throw new AppError(ErrorCode.NO_OPEN_SESSION, 'No existe una caja abierta para cerrar.');
    }

    const difference = finalCash - expectedCash;

    await prisma.cashSession.update({
      where: { id: sessionId },
      data: {
        closedAt: new Date(),
        finalCash,
        expectedCash,
        difference,
        status: 'CLOSED',
      },
    });

    await auditService.log({
      userId: session.userId,
      action: 'cash-session:closed',
      entity: 'CashSession',
      entityId: sessionId,
      payload: {
        finalCash,
        expectedCash,
        difference,
      },
    });

    return {
      finalCash,
      expectedCash,
      difference,
    };
  }

  async getActiveCashSession(userId: number): Promise<CashRegister | null> {
    const session = await prisma.cashSession.findFirst({
      where: {
        userId,
        status: 'OPEN',
      },
    });

    return session ? mapCashSession(session) : null;
  }

  async getCashSessionSummary(sessionId: number): Promise<any> {
    const payments = await prisma.payment.findMany({
      where: {
        OR: [{ cashSessionId: sessionId }, { sale: { cashSessionId: sessionId } }],
        AND: [
          {
            OR: [{ saleId: null }, { sale: { status: 'COMPLETED' } }],
          },
        ],
      },
    });

    const summary = payments.reduce(
      (acc: any, p) => {
        const method = p.method.toLowerCase();
        acc[method] = (acc[method] || 0) + Number(p.amount);
        acc.total = (acc.total || 0) + Number(p.amount);
        return acc;
      },
      { total: 0 },
    );

    return summary;
  }

  async getTodaySalesTotal(userId: number): Promise<number> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const result = await prisma.payment.aggregate({
      where: {
        sale: { userId, status: 'COMPLETED' },
        createdAt: { gte: startOfDay, lte: endOfDay },
        method: { not: 'credito' },
      },
      _sum: { amount: true },
    });

    return Number(result._sum.amount || 0);
  }

  async getMonthSalesTotal(userId: number): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const result = await prisma.payment.aggregate({
      where: {
        sale: { userId, status: 'COMPLETED' },
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        method: { not: 'credito' },
      },
      _sum: { amount: true },
    });

    return Number(result._sum.amount || 0);
  }
}
