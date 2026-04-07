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

export function registerAuthIpc(): void {
  ipcMain.handle(
    'auth:login',
    async (_event, username: string, password: string): Promise<ApiResponse<AuthSession>> => {
      try {
        const result = await authService.login(username, password);
        logger.info('auth:login-success', { username, userId: result.user.id });
        return { success: true, data: result };
      } catch (err) {
        logger.error('auth:login-error', { err, username });
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
}
