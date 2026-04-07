import { ipcMain } from 'electron';
import type { ApiResponse } from '../../renderer/src/shared/types/api.types';

import { PingService } from '../services/ping.service';
import { toApiError } from '../utils/errors';
import { logger } from '../utils/logger';

const pingService = new PingService();

export function registerPingIpc(): void {
  ipcMain.handle('ping:ping', async (): Promise<ApiResponse<string>> => {
    try {
      const result = pingService.ping();
      logger.info('ping:success', { result });
      return { success: true, data: result };
    } catch (err) {
      logger.error('ping:error', { err });
      return { success: false, error: toApiError(err) };
    }
  });
}
