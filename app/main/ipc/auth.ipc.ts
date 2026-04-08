import { ipcMain } from 'electron';
import type {
  AuthSession,
  AuthUser,
} from '../../renderer/src/shared/types/auth.types';
import type { ApiResponse } from '../../renderer/src/shared/types/api.types';

import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { toApiError } from '../utils/errors';

const authService = new AuthService();

// Rate limiting: track login attempts per username
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

function checkRateLimit(username: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const attempts = loginAttempts.get(username);

  if (!attempts) {
    return { allowed: true };
  }

  // Reset if lockout period has passed
  if (now - attempts.lastAttempt > LOGIN_LOCKOUT_MS) {
    loginAttempts.delete(username);
    return { allowed: true };
  }

  // Too many attempts within lockout window
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const retryAfter = Math.ceil((attempts.lastAttempt + LOGIN_LOCKOUT_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

function recordLoginAttempt(username: string, success: boolean): void {
  const now = Date.now();
  const attempts = loginAttempts.get(username);

  if (success) {
    loginAttempts.delete(username); // Reset on success
    return;
  }

  if (!attempts || now - attempts.lastAttempt > LOGIN_LOCKOUT_MS) {
    loginAttempts.set(username, { count: 1, lastAttempt: now });
  } else {
    attempts.count++;
    attempts.lastAttempt = now;
  }
}

export function registerAuthIpc(): void {
  ipcMain.handle(
    'auth:login',
    async (_event, username: string, password: string): Promise<ApiResponse<AuthSession>> => {
      try {
        // Check rate limit BEFORE attempting login
        const rateLimit = checkRateLimit(username);
        if (!rateLimit.allowed) {
          const retryAfter = rateLimit.retryAfter ?? 300;
          logger.warn('auth:rate-limited', { username, retryAfter });
          return {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: `Demasiados intentos. Espera ${retryAfter} segundos.`,
            },
          };
        }

        const result = await authService.login(username, password);
        recordLoginAttempt(username, true);
        logger.info('auth:login-success', { username, userId: result.user.id });
        return { success: true, data: result };
      } catch (err) {
        recordLoginAttempt(username, false);
        const code = err instanceof Error && 'code' in err ? (err as { code: string }).code : 'UNKNOWN';
        logger.error('auth:login-error', { username, code });
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'auth:validate',
    async (_event, token: string): Promise<ApiResponse<AuthUser>> => {
      try {
        const result = await authService.validateSession(token);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle('auth:logout', async (_event, token: string): Promise<ApiResponse<null>> => {
    try {
      await authService.logout(token);
      return { success: true, data: null };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });

  ipcMain.handle(
    'auth:changePassword',
    async (_event, userId: number, currentPassword: string, newPassword: string): Promise<ApiResponse<null>> => {
      try {
        await authService.changePassword(userId, currentPassword, newPassword);
        logger.info('auth:password-changed', { userId });
        return { success: true, data: null };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );
}
