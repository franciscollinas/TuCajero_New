import { ipcMain } from 'electron';
import type { ApiResponse } from '../../renderer/src/shared/types/api.types';
import type { BusinessConfig } from '../services/config.service';
import { ConfigService } from '../services/config.service';
import { toApiError } from '../utils/errors';
import { logger } from '../utils/logger';

const configService = new ConfigService();

export function registerConfigIpc(): void {
  ipcMain.handle('config:get', async (): Promise<ApiResponse<BusinessConfig>> => {
    try {
      const result = await configService.getConfig();
      return { success: true, data: result };
    } catch (err) {
      logger.error('config:get-failed', { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : 'N/A' });
      return { success: false, error: toApiError(err) };
    }
  });

  ipcMain.handle('config:getIvaRate', async (): Promise<ApiResponse<number>> => {
    try {
      const result = await configService.getIvaRate();
      return { success: true, data: result };
    } catch (err) {
      logger.error('config:getIvaRate-failed', { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : 'N/A' });
      return { success: false, error: toApiError(err) };
    }
  });

  ipcMain.handle(
    'config:update',
    async (_event, userId: number, data: Partial<BusinessConfig>): Promise<ApiResponse<BusinessConfig>> => {
      try {
        const result = await configService.updateConfig(userId, data);
        logger.info('config:update-success', { userId });
        return { success: true, data: result };
      } catch (err) {
        logger.error('config:update-error', {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
        return { success: false, error: toApiError(err) };
      }
    },
  );
}
