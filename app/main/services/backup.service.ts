import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

import type {
  BackupInfo,
  BackupListResult,
  BackupMetadata,
} from '../../renderer/src/shared/types/backup.types';
import { prisma } from '../repositories/prisma';
import { AppError, ErrorCode } from '../utils/errors';
import { logger } from '../utils/logger';
import { toFileDate } from '../utils/date';
import { AuditService } from './audit.service';

const auditService = new AuditService();

function getDatabasePath(): string {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  const match = databaseUrl.match(/file:(.+)/);
  if (match && fs.existsSync(match[1])) {
    return path.resolve(match[1]);
  }
  const possiblePaths = [
    path.join(__dirname, '../../database/tucajero.db'),
    path.join(__dirname, '../../../database/tucajero.db'),
    path.join(
      process.env.USERPROFILE || '',
      'Documents',
      'MPointOfSale',
      'database',
      'tucajero.db',
    ),
    path.join(
      app.getPath('userData'),
      '..',
      '..',
      '..',
      'Documents',
      'MPointOfSale',
      'database',
      'tucajero.db',
    ),
    'C:\\Users\\UserMaster\\Documents\\MPointOfSale\\database\\tucajero.db',
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  throw new AppError(ErrorCode.DATABASE_ERROR, 'No se encontró la base de datos actual.');
}

function getBackupDir(): string {
  return path.join(app.getPath('userData'), 'backups');
}

function ensureBackupDir(): string {
  const dir = getBackupDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
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
      throw new AppError(
        ErrorCode.FORBIDDEN,
        'Solo los administradores pueden gestionar copias de seguridad.',
      );
    }
  }

  private validateBackupFileName(fileName: string): string {
    if (!fileName.startsWith('tucajero-backup-') || !fileName.endsWith('.db')) {
      throw new AppError(ErrorCode.VALIDATION, 'Archivo de backup no válido.');
    }
    // Strip any path components to prevent traversal
    const safeName = path.basename(fileName);
    return safeName;
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
        throw new AppError(
          ErrorCode.DATABASE_ERROR,
          'La copia de seguridad generada no es válida.',
        );
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

  async deleteBackup(
    actorUserId: number,
    fileName: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.assertBackupAccess(actorUserId);

    const safeFileName = this.validateBackupFileName(fileName);

    const backupDir = getBackupDir();
    const filePath = path.join(backupDir, safeFileName);

    if (!fs.existsSync(filePath)) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `No se encontró la copia de seguridad: ${safeFileName}`,
      );
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

  async listBackups(actorUserId: number): Promise<BackupListResult> {
    await this.assertBackupAccess(actorUserId);

    const backupDir = getBackupDir();
    let files: string[] = [];
    try {
      files = fs.existsSync(backupDir)
        ? fs.readdirSync(backupDir).filter((f) => f.endsWith('.db'))
        : [];
    } catch {
      files = [];
    }

    files.sort().reverse();

    const backups: BackupMetadata[] = [];
    const dbPath = getDatabasePath();
    let totalSize = 0;

    for (const fileName of files) {
      try {
        const filePath = path.join(backupDir, fileName);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        backups.push({
          fileName,
          filePath,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
          fileSize: stats.size,
          fileSizeFormatted: formatFileSize(stats.size),
          isValid: isValidBackupFile(filePath),
          description: '',
          createdBy: 0,
          databasePath: dbPath,
        });
      } catch {
        // Skip invalid files
      }
    }

    return {
      backups,
      totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
    };
  }

  async restoreBackup(
    actorUserId: number,
    fileName: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.assertBackupAccess(actorUserId);

    const safeFileName = this.validateBackupFileName(fileName);

    const backupDir = getBackupDir();
    const backupPath = path.join(backupDir, safeFileName);
    const dbPath = getDatabasePath();

    let dbExists: boolean;
    try {
      dbExists = fs.existsSync(dbPath);
    } catch {
      throw new AppError(ErrorCode.DATABASE_ERROR, 'No se pudo verificar la base de datos actual.');
    }

    if (!dbExists) {
      throw new AppError(ErrorCode.NOT_FOUND, 'No se encontró la base de datos actual.');
    }

    let backupExists: boolean;
    try {
      backupExists = fs.existsSync(backupPath);
    } catch {
      throw new AppError(ErrorCode.DATABASE_ERROR, 'No se pudo verificar el archivo de backup.');
    }

    if (!backupExists) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        `No se encontró la copia de seguridad: ${safeFileName}`,
      );
    }

    if (!isValidBackupFile(backupPath)) {
      throw new AppError(
        ErrorCode.VALIDATION,
        'El archivo de backup no es una base de datos SQLite válida.',
      );
    }

    try {
      await prisma.$disconnect();

      const backupTarget = path.join(
        backupDir,
        `${safeFileName}.pre-restore-${toFileDate(new Date())}.db`,
      );
      fs.copyFileSync(dbPath, backupTarget);

      fs.copyFileSync(backupPath, dbPath);

      // After file copy, reconnect Prisma
      await prisma.$connect();

      if (!isValidBackupFile(dbPath)) {
        fs.copyFileSync(backupTarget, dbPath);
        throw new AppError(
          ErrorCode.DATABASE_ERROR,
          'La restauración falló: la base de datos resultante no es válida. Se revirtió el cambio.',
        );
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
    let dbSize = 0;
    try {
      dbSize = fs.existsSync(dbPath) ? getFileSize(dbPath) : 0;
    } catch {
      dbSize = 0;
    }

    const backupDir = getBackupDir();
    let backups: string[] = [];
    try {
      backups = fs.existsSync(backupDir)
        ? fs.readdirSync(backupDir).filter((f) => f.endsWith('.db'))
        : [];
    } catch {
      backups = [];
    }

    const lastBackupFile = backups[0];
    let lastBackup: BackupMetadata | null = null;
    if (lastBackupFile) {
      try {
        const filePath = path.join(backupDir, lastBackupFile);
        const stats = fs.statSync(filePath);
        lastBackup = {
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
      } catch {
        lastBackup = null;
      }
    }

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

  async checkV1Database(): Promise<{ exists: boolean; path: string }> {
    const v1Paths = [
      path.join(process.env.APPDATA || '', 'tucajero', 'tucajero.db'),
      path.join(process.env.LOCALAPPDATA || '', 'TuCajero', 'database', 'pos.db'),
      path.join(process.env.APPDATA || '', 'TuCajero', 'database', 'pos.db'),
      path.join(
        process.env.USERPROFILE || '',
        'AppData',
        'Local',
        'TuCajero',
        'database',
        'pos.db',
      ),
      path.join(process.env.LOCALAPPDATA || '', 'tucajero-updater', 'pos.db'),
      'C:\\Users\\UserMaster\\AppData\\Local\\TuCajero\\database\\pos.db',
      'C:\\Users\\UserMaster\\Documents\\Proyectos\\TuCajeroPOS\\tucajero\\tucajero.db',
    ];

    for (const p of v1Paths) {
      try {
        if (fs.existsSync(p)) {
          return { exists: true, path: p };
        }
      } catch {
        // Path check failed — continue to next candidate
      }
    }

    return { exists: false, path: '' };
  }

  async importFromV1(
    actorUserId: number,
    customPath?: string,
  ): Promise<{ success: boolean; message: string; imported: number }> {
    await this.assertBackupAccess(actorUserId);

    let v1DbPath: string;
    if (customPath) {
      v1DbPath = customPath;
    } else {
      const v1Info = await this.checkV1Database();
      if (!v1Info.exists) {
        throw new AppError(
          ErrorCode.NOT_FOUND,
          'No se encontró la base de datos de la versión anterior.',
        );
      }
      v1DbPath = v1Info.path;
    }

    try {
      interface V1Database {
        prepare: (sql: string) => { all: () => unknown[] };
        close: () => void;
      }
      const v1Db = new Database(v1DbPath, { readonly: true }) as V1Database;

      let imported = 0;

      // Import categories
      const categorias = v1Db.prepare('SELECT * FROM categorias').all() as Array<{
        id: number;
        nombre: string;
        color?: string;
      }>;
      for (const cat of categorias) {
        try {
          await prisma.category.upsert({
            where: { id: cat.id },
            create: {
              name: cat.nombre,
              color: cat.color || '#3498db',
            },
            update: {
              name: cat.nombre,
              color: cat.color || '#3498db',
            },
          });
          imported++;
        } catch (error) {
          logger.warn('V1 import: skipped category', {
            id: cat.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Import products
      const productos = v1Db.prepare('SELECT * FROM productos').all() as Array<{
        id: number;
        codigo?: string;
        nombre: string;
        precio?: number;
        costo?: number;
        stock?: number;
        stock_minimo?: number;
        activo?: number;
        categoria_id?: number;
        fecha_vencimiento?: string;
      }>;

      // Get default category ID
      const defaultCategory = await prisma.category.findFirst({ where: { name: 'General' } });
      const defaultCategoryId = defaultCategory?.id ?? 0;

      for (const prod of productos) {
        try {
          await prisma.product.upsert({
            where: { id: prod.id },
            create: {
              code: prod.codigo || `PROD-${prod.id}`,
              name: prod.nombre,
              price: prod.precio || 0,
              cost: prod.costo || 0,
              stock: prod.stock || 0,
              minStock: prod.stock_minimo || 0,
              isActive: prod.activo !== 0,
              categoryId: prod.categoria_id ?? defaultCategoryId,
              expiryDate: prod.fecha_vencimiento ? new Date(prod.fecha_vencimiento) : null,
              taxRate: 0,
            },
            update: {
              code: prod.codigo || `PROD-${prod.id}`,
              name: prod.nombre,
              price: prod.precio || 0,
              cost: prod.costo || 0,
              stock: prod.stock || 0,
              minStock: prod.stock_minimo || 0,
              isActive: prod.activo !== 0,
              categoryId: prod.categoria_id ?? defaultCategoryId,
              expiryDate: prod.fecha_vencimiento ? new Date(prod.fecha_vencimiento) : null,
              taxRate: 0,
            },
          });
          imported++;
        } catch (error) {
          logger.warn('V1 import: skipped product', {
            id: prod.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Import customers
      const clientes = v1Db.prepare('SELECT * FROM clientes').all() as Array<{
        id: number;
        nombre: string;
        telefono?: string;
        email?: string;
        direccion?: string;
      }>;
      for (const cli of clientes) {
        try {
          await prisma.customer.upsert({
            where: { id: cli.id },
            create: {
              name: cli.nombre,
              phone: cli.telefono || '',
              email: cli.email || '',
              address: cli.direccion || '',
              isActive: true,
            },
            update: {
              name: cli.nombre,
              phone: cli.telefono || '',
              email: cli.email || '',
              address: cli.direccion || '',
            },
          });
          imported++;
        } catch (error) {
          logger.warn('V1 import: skipped customer', {
            id: cli.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Import sales from V1
      try {
        const ventas = v1Db.prepare('SELECT * FROM ventas').all() as Array<{
          id: number;
          fecha: string;
          total: number;
          cliente_id?: number;
          usuario_id?: number;
          caja_id?: number;
          metodo_pago?: string;
          observaciones?: string;
        }>;
        const detallesVenta = v1Db.prepare('SELECT * FROM detalle_venta').all() as Array<{
          id: number;
          venta_id: number;
          producto_id: number;
          cantidad: number;
          precio_unitario: number;
          subtotal: number;
          descuento?: number;
        }>;

        for (const venta of ventas) {
          try {
            const saleNumber = `V1-${venta.id}-${new Date(venta.fecha).getTime()}`;
            const detalleVentaItems = detallesVenta.filter((d) => d.venta_id === venta.id);

            await prisma.sale.create({
              data: {
                id: venta.id,
                saleNumber,
                cashSessionId: 1,
                userId: venta.usuario_id || 1,
                subtotal: venta.total,
                tax: 0,
                discount: 0,
                deliveryFee: 0,
                total: venta.total,
                status: 'COMPLETED',
                customerId: venta.cliente_id || null,
                createdAt: new Date(venta.fecha),
                items: {
                  create: detalleVentaItems.map((item) => ({
                    productId: item.producto_id,
                    quantity: item.cantidad,
                    unitPrice: item.precio_unitario,
                    taxRate: 0,
                    subtotal: item.subtotal,
                    discount: item.descuento || 0,
                    total: item.subtotal - (item.descuento || 0),
                    unitType: 'UNIT',
                  })),
                },
                payments: {
                  create: [
                    {
                      method: venta.metodo_pago || 'efectivo',
                      amount: venta.total,
                      reference: venta.observaciones || null,
                      cashSessionId: 1,
                    },
                  ],
                },
              },
            });
            imported++;
          } catch (error) {
            logger.warn('V1 import: skipped sale', {
              id: venta.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      } catch {
        logger.info('V1 import: no ventas table found');
      }

      // Import cash sessions (cierres de caja)
      try {
        const cierres = v1Db.prepare('SELECT * FROM cierres_caja').all() as Array<{
          id: number;
          fecha_apertura: string;
          fecha_cierre: string;
          monto_inicial: number;
          monto_final: number;
          total_ventas: number;
          usuario_id?: number;
          observaciones?: string;
        }>;

        for (const cierre of cierres) {
          try {
            await prisma.cashSession.create({
              data: {
                id: cierre.id,
                userId: cierre.usuario_id || 1,
                status: 'CLOSED',
                initialCash: cierre.monto_inicial,
                expectedCash: cierre.monto_final,
                finalCash: cierre.monto_final,
                openedAt: new Date(cierre.fecha_apertura),
                closedAt: new Date(cierre.fecha_cierre),
              },
            });
            imported++;
          } catch (error) {
            logger.warn('V1 import: skipped cash session', {
              id: cierre.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      } catch {
        logger.info('V1 import: no cierres_caja table found');
      }

      v1Db.close();

      await auditService.log({
        userId: actorUserId,
        action: 'migration:v1-import',
        entity: 'Backup',
        payload: { imported },
      });

      return { success: true, message: `Se importaron ${imported} registros.`, imported };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ErrorCode.DATABASE_ERROR,
        'Error al importar datos de la versión anterior.',
      );
    }
  }
}
