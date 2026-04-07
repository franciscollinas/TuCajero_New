import { ipcMain } from 'electron';

import type { ApiResponse } from '../../renderer/src/shared/types/api.types';
import type { ProductAlert, AlertSummary } from '../../renderer/src/shared/types/alert.types';
import { AlertService } from '../services/alert.service';
import { toApiError } from '../utils/errors';

const alertService = new AlertService();

export function registerAlertsIpc(): void {
  ipcMain.handle(
    'alerts:getProductAlerts',
    async (): Promise<ApiResponse<ProductAlert[]>> => {
      try {
        const result = await alertService.getProductAlerts();
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'alerts:getSummary',
    async (): Promise<ApiResponse<AlertSummary>> => {
      try {
        const result = await alertService.getAlertSummary();
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );
}
