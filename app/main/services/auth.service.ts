import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import type { AuthSession, AuthUser, UserRole } from '../../renderer/src/shared/types/auth.types';
import { prisma } from '../repositories/prisma';
import { ErrorCode, AppError } from '../utils/errors';
import { validatePassword } from '../utils/password';
import { AuditService } from './audit.service';

const auditService = new AuditService();

const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000;
export const BCRYPT_ROUNDS = 12;

// Security: account lockout settings
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

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
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Credenciales inválidas.');
    }

    // Check if account is currently locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(
        ErrorCode.ACCOUNT_LOCKED,
        `Cuenta bloqueada. Intente de nuevo en ${minutesLeft} minuto(s).`,
      );
    }

    // Check if account has exceeded attempts but lock has expired — reset it
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS && (!user.lockedUntil || user.lockedUntil <= new Date())) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      // Increment failed attempts
      const newAttempts = user.failedLoginAttempts + 1;

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        // Lock the account
        const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: newAttempts, lockedUntil },
        });

        await auditService.log({
          userId: user.id,
          action: 'auth:account-locked',
          entity: 'User',
          entityId: user.id,
          payload: {
            username: user.username,
            attempts: newAttempts,
            lockedUntil: lockedUntil.toISOString(),
          },
        });

        throw new AppError(
          ErrorCode.ACCOUNT_LOCKED,
          `Demasiados intentos fallidos. Cuenta bloqueada por ${LOCKOUT_DURATION_MS / 60000} minutos.`,
        );
      }

      // Update failed attempts count (not yet locked)
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: newAttempts },
      });

      const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
      throw new AppError(
        ErrorCode.TOO_MANY_ATTEMPTS,
        `Credenciales inválidas. Quedan ${remaining} intento(s) antes del bloqueo.`,
      );
    }

    // Successful login — reset failed attempts and unlock
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
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
        previousFailedAttempts: user.failedLoginAttempts,
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
    validatePassword(password);
  }

  async unlockAccount(userId: number, actorUserId: number): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Usuario no encontrado.');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    await auditService.log({
      userId: actorUserId,
      action: 'auth:account-unlocked',
      entity: 'User',
      entityId: userId,
      payload: {
        targetUsername: user.username,
        previousAttempts: user.failedLoginAttempts,
      },
    });
  }

  async getLoginStatus(userId: number): Promise<{ failedAttempts: number; isLocked: boolean; lockedUntil: string | null }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginAttempts: true, lockedUntil: true },
    });

    if (!user) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Usuario no encontrado.');
    }

    const isLocked = !!(user.lockedUntil && user.lockedUntil > new Date());

    return {
      failedAttempts: user.failedLoginAttempts,
      isLocked,
      lockedUntil: isLocked ? user.lockedUntil!.toISOString() : null,
    };
  }
}
