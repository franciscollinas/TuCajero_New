import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

import type { UserRole } from '../../renderer/src/shared/types/auth.types';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserRecord,
  UserStats,
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

    const sessions = await prisma.session.findMany({
      where: { userId, createdAt: { gte: startOfMonth } },
      select: { createdAt: true, expiresAt: true },
    });

    let totalWorkedSeconds = 0;
    sessions.forEach((s) => {
      const start = s.createdAt.getTime();
      const end = s.expiresAt.getTime();
      totalWorkedSeconds += (end - start) / 1000;
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
}
