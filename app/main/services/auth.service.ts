import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import type { AuthSession, AuthUser, UserRole } from '../../renderer/src/shared/types/auth.types';
import { prisma } from '../repositories/prisma';
import { ErrorCode, AppError } from '../utils/errors';
import { AuditService } from './audit.service';

const auditService = new AuditService();

const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000;
export const BCRYPT_ROUNDS = 12;

function mapUser(user: {
  id: number;
  username: string;
  role: string;
  fullName: string;
  mustChangePassword?: boolean;
}): AuthUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role as UserRole,
    fullName: user.fullName,
    mustChangePassword: user.mustChangePassword ?? false,
  };
}

export class AuthService {
  async login(username: string, password: string): Promise<AuthSession> {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.active) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Usuario inválido.');
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Contraseña incorrecta.');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    await auditService.log({
      userId: user.id,
      action: 'auth:login',
      entity: 'Session',
      payload: {
        username: user.username,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      token,
      user: mapUser(user),
    };
  }

  async validateSession(token: string): Promise<AuthUser> {
    const session = await prisma.session.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!session || !session.user.active) {
      throw new AppError(ErrorCode.SESSION_EXPIRED, 'Sesión inválida o expirada.');
    }

    return mapUser(session.user);
  }

  async logout(token: string): Promise<void> {
    const session = await prisma.session.findFirst({
      where: { token },
      include: { user: true },
    });

    await prisma.session.deleteMany({
      where: { token },
    });

    if (session?.user) {
      await auditService.log({
        userId: session.user.id,
        action: 'auth:logout',
        entity: 'Session',
        payload: {
          username: session.user.username,
        },
      });
    }
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Usuario no encontrado.');
    }

    const validCurrent = await bcrypt.compare(currentPassword, user.password);
    if (!validCurrent) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'La contraseña actual es incorrecta.');
    }

    this.validatePasswordStrength(newPassword);

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    await auditService.log({
      userId,
      action: 'auth:password-changed',
      entity: 'User',
      entityId: userId,
      payload: { changedAt: new Date().toISOString() },
    });
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new AppError(ErrorCode.VALIDATION, 'La contraseña debe tener al menos 8 caracteres.');
    }
    if (!/[A-Z]/.test(password)) {
      throw new AppError(ErrorCode.VALIDATION, 'La contraseña debe contener al menos una letra mayúscula.');
    }
    if (!/[a-z]/.test(password)) {
      throw new AppError(ErrorCode.VALIDATION, 'La contraseña debe contener al menos una letra minúscula.');
    }
    if (!/[0-9]/.test(password)) {
      throw new AppError(ErrorCode.VALIDATION, 'La contraseña debe contener al menos un número.');
    }
  }
}
