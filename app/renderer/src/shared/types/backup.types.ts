export interface BackupMetadata {
  fileName: string;
  filePath: string;
  createdAt: string;
  modifiedAt: string;
  fileSize: number;
  fileSizeFormatted: string;
  isValid: boolean;
  description: string;
  createdBy: number;
  databasePath: string;
}

export interface BackupInfo {
  success: boolean;
  message: string;
  backup: BackupMetadata;
}

export interface BackupListResult {
  backups: BackupMetadata[];
  totalSize: number;
  totalSizeFormatted: string;
}

export interface BackupSummaryInfo {
  databasePath: string;
  databaseSize: number;
  databaseSizeFormatted: string;
  backupCount: number;
  backupTotalSize: number;
  backupTotalSizeFormatted: string;
  backupDir: string;
  lastBackup: BackupMetadata | null;
}

export interface V1DatabaseInfo {
  exists: boolean;
  path: string;
}

export interface V1ImportResult {
  success: boolean;
  message: string;
  imported: number;
}
