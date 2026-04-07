import bcrypt from 'bcryptjs';

import type { UserRole } from '../../renderer/src/shared/types/auth.types';
import type { CreateUserInput, UpdateUserInput, UserRecord } from '../../renderer/src/shared/types/user.types';
import { prisma } from '../repositories/prisma';
import { AppError, ErrorCode } from '../utils/errors';
import { AuditService } from './audit.service';

const auditService = new AuditService();

function mapUser(user: {
  id: number;
  username: string;
  fullName: string;
  role: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserRecord {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role as UserRole,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export class UsersService {
  private async assertAdmin(userId: number): Promise<void> {
    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, active: true },
    });

    if (!actor || !actor.active) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Usuario inválido.');
    }

    if (actor.role !== 'ADMIN') {
      throw new AppError(ErrorCode.FORBIDDEN, 'No tienes permisos para administrar usuarios.');
    }
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

    const password = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        username: data.username.trim(),
        password,
        fullName: data.fullName.trim(),
        role: data.role,
        active: true,
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

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Usuario no encontrado.');
    }

    const nextPassword = data.password ? await bcrypt.hash(data.password, 10) : undefined;

    const user = await prisma.user.update({
      where: { id },
      data: {
        fullName: data.fullName?.trim(),
        role: data.role,
        password: nextPassword,
        active: data.active,
      },
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
}
