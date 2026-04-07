import { ipcMain } from 'electron';

import type { ApiResponse } from '../../renderer/src/shared/types/api.types';
import type {
  ReportDateRange,
  ReportExportResult,
  ReportFormat,
  ReportsDashboardData,
  ReportType,
} from '../../renderer/src/shared/types/reports.types';
import { ReportsService } from '../services/reports.service';
import { toApiError } from '../utils/errors';
import { logger } from '../utils/logger';

const reportsService = new ReportsService();

export function registerReportsIpc(): void {
  ipcMain.handle(
    'reports:getDashboardData',
    async (_event, actorUserId: number, range: ReportDateRange): Promise<ApiResponse<ReportsDashboardData>> => {
      try {
        const result = await reportsService.getDashboardData(actorUserId, range);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'reports:export',
    async (
      _event,
      actorUserId: number,
      reportType: ReportType,
      format: ReportFormat,
      range: ReportDateRange,
    ): Promise<ApiResponse<ReportExportResult>> => {
      try {
        const result = await reportsService.exportReport(actorUserId, reportType, format, range);
        logger.info('reports:export-success', {
          actorUserId,
          reportType: result.reportType,
          format: result.format,
          filePath: result.filePath,
        });
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );
}
