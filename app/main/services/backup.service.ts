import { app } from 'electron';
import fs from 'fs';
import path from 'path';

import type {
  BackupInfo,
  BackupListResult,
  BackupMetadata,
} from '../../renderer/src/shared/types/backup.types';
import { prisma } from '../repositories/prisma';
import { AppError, ErrorCode } from '../utils/errors';
import { AuditService } from './audit.service';

const auditService = new AuditService();

function getDatabasePath(): string {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  const match = databaseUrl.match(/file:(.+)/);
  if (!match) {
    throw new AppError(ErrorCode.DATABASE_ERROR, 'No se pudo determinar la ruta de la base de datos.');
  }
  return path.resolve(match[1]);
}

function getBackupDir(): string {
  return path.join(app.getPath('userData'), 'backups');
}

function ensureBackupDir(): string {
  const dir = getBackupDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function toFileDate(value: Date): string {
  return value.toISOString().replace(/[:.]/g, '-');
}

function getFileSize(filePath: string): number {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidBackupFile(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) return false;

    const content = fs.readFileSync(filePath);
    if (content.length < 100) return false;

    const header = content.slice(0, 16).toString('latin1');
    return header.startsWith('SQLite format 3');
  } catch {
    return false;
  }
}

export class BackupService {
  private async assertBackupAccess(actorUserId: number): Promise<void> {
    const actor = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { active: true, role: true },
    });

    if (!actor || !actor.active) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Usuario inválido o inactivo.');
    }

    if (actor.role !== 'ADMIN') {
      throw new AppError(ErrorCode.FORBIDDEN, 'Solo los administradores pueden gestionar copias de seguridad.');
    }
  }

  async createBackup(actorUserId: number, description?: string): Promise<BackupInfo> {
    await this.assertBackupAccess(actorUserId);

    const dbPath = getDatabasePath();
    if (!fs.existsSync(dbPath)) {
      throw new AppError(ErrorCode.DATABASE_ERROR, 'No se encontró la base de datos actual.');
    }

    const backupDir = ensureBackupDir();
    const timestamp = toFileDate(new Date());
    const fileName = `tucajero-backup-${timestamp}.db`;
    const backupPath = path.join(backupDir, fileName);

    try {
      fs.copyFileSync(dbPath, backupPath);

      if (!isValidBackupFile(backupPath)) {
        fs.unlinkSync(backupPath);
        throw new AppError(ErrorCode.DATABASE_ERROR, 'La copia de seguridad generada no es válida.');
      }

      const fileSize = getFileSize(backupPath);

      const metadata: BackupMetadata = {
        fileName,
        filePath: backupPath,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        createdBy: actorUserId,
        description: description ?? '',
        fileSize,
        fileSizeFormatted: formatFileSize(fileSize),
        databasePath: dbPath,
        isValid: true,
      };

      await auditService.log({
        userId: actorUserId,
        action: 'backup:created',
        entity: 'Backup',
        entityId: undefined,
        payload: {
          fileName,
          fileSize,
          description,
        },
      });

      return {
        success: true,
        message: 'Copia de seguridad creada correctamente.',
        backup: metadata,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.DATABASE_ERROR, 'Error al crear la copia de seguridad.');
    }
  }

  listBackups(actorUserId: number): BackupListResult {
    void actorUserId;
    const backupDir = getBackupDir();

    if (!fs.existsSync(backupDir)) {
      return { backups: [], totalSize: 0, totalSizeFormatted: '0 B' };
    }

    const files = fs.readdirSync(backupDir)
      .filter((file) => file.endsWith('.db'))
      .map((file) => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const isValid = isValidBackupFile(filePath);

        return {
          fileName: file,
          filePath,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
          fileSize: stats.size,
          fileSizeFormatted: formatFileSize(stats.size),
          isValid,
          description: '',
          createdBy: 0,
          databasePath: getDatabasePath(),
        } satisfies BackupMetadata;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);

    return {
      backups: files,
      totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
    };
  }

  async deleteBackup(actorUserId: number, fileName: string): Promise<{ success: boolean; message: string }> {
    await this.assertBackupAccess(actorUserId);

    const backupDir = getBackupDir();
    const filePath = path.join(backupDir, fileName);

    if (!fs.existsSync(filePath)) {
      throw new AppError(ErrorCode.NOT_FOUND, `No se encontró la copia de seguridad: ${fileName}`);
    }

    if (!fileName.startsWith('tucajero-backup-') || !fileName.endsWith('.db')) {
      throw new AppError(ErrorCode.VALIDATION, 'Archivo de backup no válido.');
    }

    try {
      fs.unlinkSync(filePath);

      await auditService.log({
        userId: actorUserId,
        action: 'backup:deleted',
        entity: 'Backup',
        payload: { fileName },
      });

      return { success: true, message: 'Copia de seguridad eliminada.' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.DATABASE_ERROR, 'Error al eliminar la copia de seguridad.');
    }
  }

  async restoreBackup(actorUserId: number, fileName: string): Promise<{ success: boolean; message: string }> {
    await this.assertBackupAccess(actorUserId);

    const backupDir = getBackupDir();
    const backupPath = path.join(backupDir, fileName);
    const dbPath = getDatabasePath();

    if (!fs.existsSync(backupPath)) {
      throw new AppError(ErrorCode.NOT_FOUND, `No se encontró la copia de seguridad: ${fileName}`);
    }

    if (!isValidBackupFile(backupPath)) {
      throw new AppError(ErrorCode.VALIDATION, 'El archivo de backup no es una base de datos SQLite válida.');
    }

    try {
      await prisma.$disconnect();

      const backupTarget = path.join(backupDir, `${fileName}.pre-restore-${toFileDate(new Date())}.db`);
      fs.copyFileSync(dbPath, backupTarget);

      fs.copyFileSync(backupPath, dbPath);

      if (!isValidBackupFile(dbPath)) {
        fs.copyFileSync(backupTarget, dbPath);
        throw new AppError(ErrorCode.DATABASE_ERROR, 'La restauración falló: la base de datos resultante no es válida. Se revirtió el cambio.');
      }

      await auditService.log({
        userId: actorUserId,
        action: 'backup:restored',
        entity: 'Backup',
        payload: {
          fileName,
          backupPath,
          previousDbBackup: backupTarget,
        },
      });

      return {
        success: true,
        message: 'Base de datos restaurada correctamente. La aplicación se reiniciará en breve.',
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.DATABASE_ERROR, 'Error al restaurar la copia de seguridad.');
    }
  }

  async getBackupInfo(actorUserId: number): Promise<{
    databasePath: string;
    databaseSize: number;
    databaseSizeFormatted: string;
    backupCount: number;
    backupTotalSize: number;
    backupTotalSizeFormatted: string;
    backupDir: string;
    lastBackup: BackupMetadata | null;
  }> {
    await this.assertBackupAccess(actorUserId);

    const dbPath = getDatabasePath();
    const dbSize = fs.existsSync(dbPath) ? getFileSize(dbPath) : 0;

    const backupDir = getBackupDir();
    const backups = fs.existsSync(backupDir)
      ? fs.readdirSync(backupDir).filter((f) => f.endsWith('.db'))
      : [];

    const lastBackupFile = backups[0];
    const lastBackup: BackupMetadata | null = lastBackupFile
      ? ((): BackupMetadata => {
          const filePath = path.join(backupDir, lastBackupFile);
          const stats = fs.statSync(filePath);
          return {
            fileName: lastBackupFile,
            filePath,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            fileSize: stats.size,
            fileSizeFormatted: formatFileSize(stats.size),
            isValid: isValidBackupFile(filePath),
            description: '',
            createdBy: 0,
            databasePath: dbPath,
          };
        })()
      : null;

    const totalBackupSize = backups.reduce((sum, file) => {
      try {
        return sum + getFileSize(path.join(backupDir, file));
      } catch {
        return sum;
      }
    }, 0);

    return {
      databasePath: dbPath,
      databaseSize: dbSize,
      databaseSizeFormatted: formatFileSize(dbSize),
      backupCount: backups.length,
      backupTotalSize: totalBackupSize,
      backupTotalSizeFormatted: formatFileSize(totalBackupSize),
      backupDir: getBackupDir(),
      lastBackup,
    };
  }
}
