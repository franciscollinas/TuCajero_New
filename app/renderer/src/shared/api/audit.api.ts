import type { ApiResponse } from '../types/api.types';
import type { AuditLogEntry } from '../types/audit.types';

export function getRecentAuditLogs(limit = 100): Promise<ApiResponse<AuditLogEntry[]>> {
  return window.api.invoke<AuditLogEntry[]>('audit:list', limit);
}
