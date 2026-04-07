import { ipcMain } from 'electron';

import type { ApiResponse } from '../../renderer/src/shared/types/api.types';
import type { AuditLogEntry } from '../../renderer/src/shared/types/audit.types';
import { AuditService } from '../services/audit.service';
import { toApiError } from '../utils/errors';

const auditService = new AuditService();

export function registerAuditIpc(): void {
  ipcMain.handle('audit:list', async (_event, limit = 100): Promise<ApiResponse<AuditLogEntry[]>> => {
    try {
      const result = await auditService.getRecentLogs(limit);
      return {
        success: true,
        data: result.map((entry) => ({
          id: entry.id,
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          payload: entry.payload,
          createdAt: entry.createdAt.toISOString(),
          user: {
            id: entry.user.id,
            username: entry.user.username,
            fullName: entry.user.fullName,
            role: entry.user.role,
          },
        })),
      };
    } catch (err) {
      return { success: false, error: toApiError(err) };
    }
  });
}
