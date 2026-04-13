import { ipcMain } from 'electron';

import type { ApiResponse } from '../../renderer/src/shared/types/api.types';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserRecord,
  UserStats,
  PayrollPeriod,
  PayrollAllUsersResult,
} from '../../renderer/src/shared/types/user.types';
import { toApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { UsersService } from '../services/users.service';

const usersService = new UsersService();

export function registerUsersIpc(): void {
  ipcMain.handle(
    'users:list',
    async (_event, actorUserId: number): Promise<ApiResponse<UserRecord[]>> => {
      try {
        const result = await usersService.listUsers(actorUserId);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'users:create',
    async (_event, data: CreateUserInput): Promise<ApiResponse<UserRecord>> => {
      try {
        const result = await usersService.createUser(data);
        logger.info('users:create-success', { userId: result.id, username: result.username });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'users:update',
    async (_event, id: number, data: UpdateUserInput): Promise<ApiResponse<UserRecord>> => {
      try {
        const result = await usersService.updateUser(id, data);
        logger.info('users:update-success', { userId: id });
        return { success: true, data: result };
      } catch (err) {
        logger.error('users:update-error', { err, userId: id });
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'users:toggleActive',
    async (
      _event,
      id: number,
      active: boolean,
      actorUserId: number,
    ): Promise<ApiResponse<UserRecord>> => {
      try {
        const result = await usersService.toggleUserActive(id, active, actorUserId);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'users:getStats',
    async (_event, userId: number): Promise<ApiResponse<UserStats>> => {
      try {
        const result = await usersService.getUserStats(userId);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle('users:getAllStats', async (): Promise<ApiResponse<UserStats[]>> => {
    try {
      const result = await usersService.getAllUserStats();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });

  ipcMain.handle(
    'users:getPayrollReport',
    async (
      _event,
      actorUserId: number,
      period: PayrollPeriod = 'weekly',
      targetUserId?: number,
    ): Promise<ApiResponse<PayrollAllUsersResult>> => {
      try {
        const result = await usersService.getPayrollReport(actorUserId, period, targetUserId);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );
}
