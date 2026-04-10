import { ipcMain } from 'electron';

import type { ApiResponse } from '../../renderer/src/shared/types/api.types';
import type {
  BackupInfo,
  BackupListResult,
  V1DatabaseInfo,
  V1ImportResult,
} from '../../renderer/src/shared/types/backup.types';
import { BackupService } from '../services/backup.service';
import { toApiError } from '../utils/errors';
import { logger } from '../utils/logger';

const backupService = new BackupService();

export function registerBackupIpc(): void {
  ipcMain.handle(
    'backup:create',
    async (_event, actorUserId: number, description?: string): Promise<ApiResponse<BackupInfo>> => {
      try {
        const result = await backupService.createBackup(actorUserId, description);
        logger.info('backup:create-success', {
          actorUserId,
          fileName: result.backup.fileName,
          fileSize: result.backup.fileSize,
        });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'backup:list',
    async (_event, actorUserId: number): Promise<ApiResponse<BackupListResult>> => {
      try {
        const result = backupService.listBackups(actorUserId);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'backup:delete',
    async (
      _event,
      actorUserId: number,
      fileName: string,
    ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
      try {
        const result = await backupService.deleteBackup(actorUserId, fileName);
        logger.info('backup:delete-success', { actorUserId, fileName });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'backup:restore',
    async (
      _event,
      actorUserId: number,
      fileName: string,
    ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
      try {
        const result = await backupService.restoreBackup(actorUserId, fileName);
        logger.info('backup:restore-success', { actorUserId, fileName });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'backup:info',
    async (
      _event,
      actorUserId: number,
    ): Promise<ApiResponse<Awaited<ReturnType<typeof backupService.getBackupInfo>>>> => {
      try {
        const result = await backupService.getBackupInfo(actorUserId);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle('backup:check-v1', async (): Promise<ApiResponse<V1DatabaseInfo>> => {
    try {
      const result = await backupService.checkV1Database();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });

  ipcMain.handle(
    'backup:import-v1',
    async (_event, actorUserId: number): Promise<ApiResponse<V1ImportResult>> => {
      try {
        const result = await backupService.importFromV1(actorUserId);
        logger.info('backup:import-v1-success', { actorUserId, imported: result.imported });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );
}
