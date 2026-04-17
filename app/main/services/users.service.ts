import bcrypt from 'bcryptjs';
import { Prisma } from '../../../database/generated-client';

import type { UserRole } from '../../renderer/src/shared/types/auth.types';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserRecord,
  UserStats,
  PayrollPeriod,
  PayrollDayEntry,
  PayrollUserSummary,
  PayrollAllUsersResult,
} from '../../renderer/src/shared/types/user.types';
import { prisma } from '../repositories/prisma';
import { AppError, ErrorCode } from '../utils/errors';
import { assertRoleAccess } from '../utils/prisma-helpers';
import { validatePassword } from '../utils/password';
import { AuditService } from './audit.service';
import { BCRYPT_ROUNDS } from './auth.service';

const auditService = new AuditService();

function mapUser(user: {
  id: number;
  username: string;
  fullName: string;
  role: string;
  active: boolean;
  hourlyRate: Prisma.Decimal | null;
  createdAt: Date;
  updatedAt: Date;
}): UserRecord {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role as UserRole,
    active: user.active,
    hourlyRate: user.hourlyRate ? Number(user.hourlyRate) : undefined,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export class UsersService {
  private async assertAdmin(userId: number): Promise<void> {
    await assertRoleAccess(
      userId,
      ['ADMIN'],
      'No tienes permisos para administrar usuarios.',
    );
  }

  async listUsers(actorUserId: number): Promise<UserRecord[]> {
    await this.assertAdmin(actorUserId);

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return users.map(mapUser);
  }

  async createUser(data: CreateUserInput): Promise<UserRecord> {
    await this.assertAdmin(data.actorUserId);

    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existing) {
      throw new AppError(ErrorCode.VALIDATION, 'Ese nombre de usuario ya existe.');
    }

    validatePassword(data.password);

    const password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        username: data.username.trim(),
        password,
        fullName: data.fullName.trim(),
        role: data.role,
        active: true,
        mustChangePassword: true,
        hourlyRate: data.hourlyRate || 15000,
      },
    });

    await auditService.log({
      userId: data.actorUserId,
      action: 'user:created',
      entity: 'User',
      entityId: user.id,
      payload: {
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
    });

    return mapUser(user);
  }

  async updateUser(id: number, data: UpdateUserInput): Promise<UserRecord> {
    await this.assertAdmin(data.actorUserId);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Usuario no encontrado.');
    }

    let nextPassword: string | undefined;
    if (data.password) {
      validatePassword(data.password);
      nextPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    const newData: Prisma.UserUpdateArgs['data'] = {
      fullName: data.fullName?.trim(),
      role: data.role,
    };
    if (nextPassword) newData.password = nextPassword;
    if (data.active !== undefined) newData.active = data.active;
    if (data.hourlyRate) newData.hourlyRate = data.hourlyRate;

    const user = await prisma.user.update({
      where: { id },
      data: newData,
    });

    await auditService.log({
      userId: data.actorUserId,
      action: 'user:edited',
      entity: 'User',
      entityId: user.id,
      payload: {
        before: {
          fullName: existing.fullName,
          role: existing.role,
          active: existing.active,
        },
        after: {
          fullName: user.fullName,
          role: user.role,
          active: user.active,
        },
      },
    });

    return mapUser(user);
  }

  async toggleUserActive(id: number, active: boolean, actorUserId: number): Promise<UserRecord> {
    await this.assertAdmin(actorUserId);

    const user = await prisma.user.update({
      where: { id },
      data: { active },
    });

    // Revoke ALL sessions when deactivating a user
    if (!active) {
      await prisma.session.deleteMany({
        where: { userId: id },
      });
    }

    await auditService.log({
      userId: actorUserId,
      action: 'user:edited',
      entity: 'User',
      entityId: user.id,
      payload: {
        active,
      },
    });

    return mapUser(user);
  }

  async getUserStats(userId: number): Promise<UserStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Sessions are now preserved (closedAt instead of deleted) so we can use them
    const sessions = await prisma.session.findMany({
      where: { userId, createdAt: { gte: startOfMonth } },
      select: { createdAt: true, expiresAt: true, closedAt: true },
    });

    let totalWorkedSeconds = 0;
    sessions.forEach((s) => {
      const start = s.createdAt.getTime();
      // Use closedAt if set, otherwise use expiresAt
      const end = s.closedAt ? s.closedAt.getTime() : s.expiresAt.getTime();
      totalWorkedSeconds += Math.max(0, (end - start) / 1000);
    });

    const salesResult = await prisma.sale.aggregate({
      where: { userId, status: 'COMPLETED', createdAt: { gte: startOfMonth }, debt: null },
      _sum: { total: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, fullName: true },
    });

    return {
      id: userId,
      username: user?.username || '',
      fullName: user?.fullName || '',
      totalWorkedSeconds,
      monthlySales: Number(salesResult._sum.total || 0),
    };
  }

  async getAllUserStats(): Promise<UserStats[]> {
    const users = await prisma.user.findMany({
      where: { role: 'CASHIER', active: true },
      select: { id: true },
    });

    const stats = await Promise.all(users.map((u) => this.getUserStats(u.id)));
    return stats;
  }

  // ─── Payroll Report ────────────────────────────────────────────────

  async getPayrollReport(
    actorUserId: number,
    period: PayrollPeriod = 'weekly',
    targetUserId?: number,
  ): Promise<PayrollAllUsersResult> {
    await assertRoleAccess(
      actorUserId,
      ['ADMIN'],
      'No tienes permisos para consultar nómina.',
    );

    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = endOfDay(now);

    if (period === 'daily') {
      periodStart = startOfDay(now);
    } else if (period === 'weekly') {
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      periodStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday));
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    // Get all cashier users
    const cashiers = await prisma.user.findMany({
      where: targetUserId ? { id: targetUserId } : { role: 'CASHIER' },
      orderBy: { fullName: 'asc' },
    });

    const DAY_NAMES_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const userSummaries: PayrollUserSummary[] = [];
    let grandTotalPay = 0;
    let grandTotalHours = 0;
    let grandTotalSales = 0;

    for (const cashier of cashiers) {
      const hourlyRate = cashier.hourlyRate ? Number(cashier.hourlyRate) : 15000;

      // Get all sessions for this cashier in the period
      const sessions = await prisma.session.findMany({
        where: {
          userId: cashier.id,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Group sessions by date
      const sessionsByDate = new Map<string, typeof sessions>();
      for (const session of sessions) {
        const dateKey = session.createdAt.toISOString().slice(0, 10);
        if (!sessionsByDate.has(dateKey)) {
          sessionsByDate.set(dateKey, []);
        }
        sessionsByDate.get(dateKey)!.push(session);
      }

      // Get all sales for this cashier in the period
      const sales = await prisma.sale.findMany({
        where: {
          userId: cashier.id,
          status: 'COMPLETED',
          createdAt: { gte: periodStart, lte: periodEnd },
          debt: null,
        },
        select: {
          createdAt: true,
          total: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      // Group sales by date
      const salesByDate = new Map<string, number>();
      for (const sale of sales) {
        const dateKey = sale.createdAt.toISOString().slice(0, 10);
        const currentTotal = salesByDate.get(dateKey) || 0;
        salesByDate.set(dateKey, currentTotal + Number(sale.total));
      }

      // Build daily entries
      const days: PayrollDayEntry[] = [];
      let totalWorkedSeconds = 0;
      let totalSalesAmount = 0;

      for (const [dateStr, daySessions] of sessionsByDate) {
        let daySeconds = 0;
        for (const s of daySessions) {
          const start = s.createdAt.getTime();
          // Use closedAt if set (actual logout time), otherwise expiresAt
          const end = s.closedAt ? s.closedAt.getTime() : s.expiresAt.getTime();
          daySeconds += Math.max(0, (end - start) / 1000);
        }

        const workedHours = daySeconds / 3600;
        const dayDate = new Date(dateStr + 'T12:00:00');
        const dayName = DAY_NAMES_ES[dayDate.getDay()];
        const dailySales = salesByDate.get(dateStr) || 0;

        days.push({
          date: dateStr,
          dayName,
          loginCount: daySessions.length,
          workedSeconds: daySeconds,
          workedHours: Math.round(workedHours * 100) / 100,
          hourlyRate,
          payAmount: Math.round(hourlyRate * workedHours),
          dailySalesTotal: Math.round(dailySales * 100) / 100,
        });

        totalWorkedSeconds += daySeconds;
        totalSalesAmount += dailySales;
      }

      const totalHours = totalWorkedSeconds / 3600;
      const totalPay = Math.round(hourlyRate * totalHours);

      userSummaries.push({
        userId: cashier.id,
        fullName: cashier.fullName,
        username: cashier.username,
        hourlyRate,
        period,
        periodStart: periodStart.toISOString().slice(0, 10),
        periodEnd: periodEnd.toISOString().slice(0, 10),
        days,
        totalDays: days.length,
        totalWorkedSeconds,
        totalWorkedHours: Math.round(totalHours * 100) / 100,
        totalPayAmount: totalPay,
        totalSalesAmount: Math.round(totalSalesAmount * 100) / 100,
      });

      grandTotalPay += totalPay;
      grandTotalHours += totalHours;
      grandTotalSales += totalSalesAmount;
    }

    return {
      users: userSummaries,
      grandTotalPay,
      grandTotalHours: Math.round(grandTotalHours * 100) / 100,
      grandTotalSales: Math.round(grandTotalSales * 100) / 100,
      generatedAt: new Date().toISOString(),
    };
  }
}

// ─── Date helpers (local) ────────────────────────────────────────────

function startOfDay(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value: Date): Date {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
}
