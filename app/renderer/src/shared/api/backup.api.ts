import type { ApiResponse } from '../types/api.types';
import type {
  BackupInfo,
  BackupListResult,
  BackupSummaryInfo,
  V1DatabaseInfo,
  V1ImportResult,
} from '../types/backup.types';

export function createBackup(
  actorUserId: number,
  description?: string,
): Promise<ApiResponse<BackupInfo>> {
  return window.api.invoke<BackupInfo>('backup:create', actorUserId, description);
}

export function listBackups(actorUserId: number): Promise<ApiResponse<BackupListResult>> {
  return window.api.invoke<BackupListResult>('backup:list', actorUserId);
}

export function deleteBackup(
  actorUserId: number,
  fileName: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return window.api.invoke('backup:delete', actorUserId, fileName);
}

export function restoreBackup(
  actorUserId: number,
  fileName: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return window.api.invoke('backup:restore', actorUserId, fileName);
}

export function getBackupInfo(actorUserId: number): Promise<ApiResponse<BackupSummaryInfo>> {
  return window.api.invoke<BackupSummaryInfo>('backup:info', actorUserId);
}

export function checkV1Database(): Promise<ApiResponse<V1DatabaseInfo>> {
  return window.api.invoke<V1DatabaseInfo>('backup:check-v1');
}

export function importFromV1(actorUserId: number): Promise<ApiResponse<V1ImportResult>> {
  return window.api.invoke<V1ImportResult>('backup:import-v1', actorUserId);
}
