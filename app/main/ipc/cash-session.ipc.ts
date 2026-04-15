import { ipcMain } from 'electron';
import type {
  CashCloseSummary,
  CashClosureRow,
  CashRegister,
} from '../../renderer/src/shared/types/cash.types';
import type { ApiResponse } from '../../renderer/src/shared/types/api.types';

import { CashSessionService } from '../services/cash-session.service';
import { logger } from '../utils/logger';
import { toApiError } from '../utils/errors';

const cashSessionService = new CashSessionService();

export function registerCashSessionIpc(): void {
  ipcMain.handle(
    'cash:listClosures',
    async (_event, take?: number): Promise<ApiResponse<CashClosureRow[]>> => {
      try {
        const result = await cashSessionService.listCashClosures(take);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'cash:open',
    async (_event, userId: number, initialCash: number): Promise<ApiResponse<CashRegister>> => {
      try {
        const result = await cashSessionService.openCashSession(userId, initialCash);
        logger.info('cash:open-success', { sessionId: result.id, userId });
        return { success: true, data: result };
      } catch (err) {
        logger.error('cash:open-error', { err, userId });
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'cash:close',
    async (
      _event,
      sessionId: number,
      finalCash: number,
      expectedCash: number,
    ): Promise<ApiResponse<CashCloseSummary>> => {
      try {
        const result = await cashSessionService.closeCashSession(
          sessionId,
          finalCash,
          expectedCash,
        );
        logger.info('cash:close-success', { sessionId });
        return { success: true, data: result };
      } catch (err) {
        logger.error('cash:close-error', { err, sessionId });
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'cash:getActive',
    async (_event, userId: number): Promise<ApiResponse<CashRegister | null>> => {
      try {
        const result = await cashSessionService.getActiveCashSession(userId);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'cash:getSummary',
    async (_event, sessionId: number): Promise<ApiResponse<any>> => {
      try {
        const result = await cashSessionService.getCashSessionSummary(sessionId);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'cash:getTodaySalesTotal',
    async (_event, userId: number): Promise<ApiResponse<number>> => {
      try {
        const result = await cashSessionService.getTodaySalesTotal(userId);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'cash:getMonthSalesTotal',
    async (_event, userId: number): Promise<ApiResponse<number>> => {
      try {
        const result = await cashSessionService.getMonthSalesTotal(userId);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );
}
