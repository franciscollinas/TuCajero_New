import { ipcMain } from 'electron';

import type { ApiResponse } from '../../renderer/src/shared/types/api.types';
import type { CreateUserInput, UpdateUserInput, UserRecord } from '../../renderer/src/shared/types/user.types';
import { toApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { UsersService } from '../services/users.service';

const usersService = new UsersService();

export function registerUsersIpc(): void {
  ipcMain.handle('users:list', async (_event, actorUserId: number): Promise<ApiResponse<UserRecord[]>> => {
    try {
      const result = await usersService.listUsers(actorUserId);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });

  ipcMain.handle('users:create', async (_event, data: CreateUserInput): Promise<ApiResponse<UserRecord>> => {
    try {
      const result = await usersService.createUser(data);
      logger.info('users:create-success', { userId: result.id, username: result.username });
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });

  ipcMain.handle(
    'users:update',
    async (_event, id: number, data: UpdateUserInput): Promise<ApiResponse<UserRecord>> => {
      try {
        const result = await usersService.updateUser(id, data);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'users:toggleActive',
    async (_event, id: number, active: boolean, actorUserId: number): Promise<ApiResponse<UserRecord>> => {
      try {
        const result = await usersService.toggleUserActive(id, active, actorUserId);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );
}
