import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';

import type { AuditLogEntry } from '../../renderer/src/shared/types/audit.types';
import type {
  CashSessionReportRow,
  InventoryReportRow,
  InventorySummary,
  ReportDateRange,
  ReportExportResult,
  ReportFormat,
  ReportsDashboardData,
  ReportsSummary,
  ReportType,
  SalesReportRow,
  AuditSummary,
} from '../../renderer/src/shared/types/reports.types';
import type { WorkerInput, WorkerOutput } from '../workers/report.worker';
import type { MonthlySalesData } from '../../renderer/src/shared/types/reports.types';
import { prisma } from '../repositories/prisma';
import { AppError, ErrorCode } from '../utils/errors';
import { assertRoleAccess } from '../utils/prisma-helpers';
import { startOfDay, endOfDay, toFileDate, toIsoDate } from '../utils/date';
import { AuditService } from './audit.service';

const auditService = new AuditService();

export class ReportsService {
  private async assertReportsAccess(actorUserId: number): Promise<void> {
    await assertRoleAccess(
      actorUserId,
      ['ADMIN', 'SUPERVISOR'],
      'No tienes permisos para consultar reportes.',
    );
  }

  private toInventoryStatus(row: {
    stock: number;
    minStock: number;
    criticalStock: number;
    expiryDate: Date | null;
  }): InventoryReportRow['status'] {
    if (row.expiryDate) {
      const now = new Date();
      const expiry = row.expiryDate;
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      if (expiry.getTime() < now.getTime()) return 'expired';
      if (expiry.getTime() - now.getTime() <= thirtyDays) return 'expiring';
    }
    if (row.stock <= row.criticalStock) return 'critical';
    if (row.stock <= row.minStock) return 'warning';
    return 'ok';
  }

  private resolveRange(input: ReportDateRange): {
    start: Date;
    end: Date;
    normalized: ReportDateRange;
  } {
    // Interpretar fechas como zona local del servidor (POS)
    const start = new Date(input.startDate + 'T00:00:00');
    const end = new Date(input.endDate + 'T23:59:59.999');

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new AppError(ErrorCode.VALIDATION, 'El rango de fechas no es válido.');
    }

    if (start.getTime() > end.getTime()) {
      throw new AppError(
        ErrorCode.VALIDATION,
        'La fecha inicial no puede ser mayor que la fecha final.',
      );
    }

    return {
      start,
      end,
      normalized: {
        startDate: input.startDate,
        endDate: input.endDate,
      },
    };
  }

  private async loadSales(start: Date, end: Date): Promise<SalesReportRow[]> {
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        payments: true,
        items: true,
        user: {
          select: {
            fullName: true,
          },
        },
        debt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return (sales as any[]).map((sale: any) => {
      const paymentMap = sale.payments.reduce((acc, payment) => {
        acc[payment.method] = (acc[payment.method] ?? 0) + Number(payment.amount);
        return acc;
      }, {});

      const isCredit = !!sale.debt;

      return {
        id: sale.id,
        saleNumber: sale.saleNumber,
        createdAt: sale.createdAt.toISOString(),
        cashierName: sale.user.fullName,
        status: sale.status,
        itemsCount: sale.items.length,
        subtotal: Number(sale.subtotal),
        tax: Number(sale.tax),
        discount: Number(sale.discount),
        total: Number(sale.total),
        isCredit,
        payments: Object.entries(paymentMap).map(([label, value]) => ({
          label,
          value: Number(value) as number,
        })),
      };
    });
  }

  private buildSalesSummary(sales: SalesReportRow[]): ReportsSummary {
    const completed = sales.filter((sale) => sale.status === 'COMPLETED' && !sale.isCredit);
    const paymentsByMethod = completed.reduce<Record<string, number>>((acc, sale) => {
      sale.payments.forEach((payment) => {
        acc[payment.label] = (acc[payment.label] ?? 0) + payment.value;
      });
      return acc;
    }, {});

    const grossRevenue = completed.reduce((sum, sale) => sum + sale.subtotal + sale.tax, 0);
    const totalDiscount = completed.reduce((sum, sale) => sum + sale.discount, 0);
    const netRevenue = completed.reduce((sum, sale) => sum + sale.total, 0);

    return {
      totalSales: sales.length,
      completedSales: completed.length,
      cancelledSales: sales.filter((sale) => sale.status === 'CANCELLED').length,
      grossRevenue,
      netRevenue,
      totalTax: completed.reduce((sum, sale) => sum + sale.tax, 0),
      totalDiscount,
      averageTicket: completed.length > 0 ? netRevenue / completed.length : 0,
      paymentsByMethod: Object.entries(paymentsByMethod).map(([label, value]) => ({
        label,
        value,
      })),
    };
  }

  private async loadCashSessions(start: Date, end: Date): Promise<CashSessionReportRow[]> {
    const sessions = await prisma.cashSession.findMany({
      where: {
        openedAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
        sales: {
          where: {
            status: 'COMPLETED',
          },
          select: {
            total: true,
          },
        },
      },
      orderBy: {
        openedAt: 'desc',
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      cashierName: session.user.fullName,
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt ? session.closedAt.toISOString() : null,
      status: session.status,
      initialCash: Number(session.initialCash),
      expectedCash: session.expectedCash ? Number(session.expectedCash) : null,
      finalCash: session.finalCash ? Number(session.finalCash) : null,
      difference: session.difference ? Number(session.difference) : null,
      salesCount: session.sales.length,
      salesTotal: session.sales.reduce((sum, sale) => sum + Number(sale.total), 0),
    }));
  }

  private async loadInventory(): Promise<InventoryReportRow[]> {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return products.map((product) => ({
      id: product.id,
      code: product.code,
      barcode: product.barcode,
      name: product.name,
      categoryName: product.category.name,
      stock: product.stock,
      minStock: product.minStock,
      criticalStock: product.criticalStock,
      price: Number(product.price),
      cost: Number(product.cost),
      stockValue: product.stock * Number(product.cost),
      expiryDate: product.expiryDate ? product.expiryDate.toISOString() : null,
      location: product.location,
      status: this.toInventoryStatus(product),
    }));
  }

  private buildInventorySummary(inventory: InventoryReportRow[]): InventorySummary {
    return {
      totalProducts: inventory.length,
      totalUnits: inventory.reduce((sum, item) => sum + item.stock, 0),
      totalStockValue: inventory.reduce((sum, item) => sum + item.stockValue, 0),
      lowStockCount: inventory.filter((item) => item.status === 'warning').length,
      criticalStockCount: inventory.filter((item) => item.status === 'critical').length,
      expiredCount: inventory.filter((item) => item.status === 'expired').length,
      expiringCount: inventory.filter((item) => item.status === 'expiring').length,
    };
  }

  private async loadAuditLogs(start: Date, end: Date): Promise<AuditLogEntry[]> {
    const logs = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });

    return logs.map((entry) => ({
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
    }));
  }

  private buildAuditSummary(logs: AuditLogEntry[]): AuditSummary {
    const actionMap = logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.action] = (acc[log.action] ?? 0) + 1;
      return acc;
    }, {});

    const topActions = Object.entries(actionMap)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));

    return {
      totalLogs: logs.length,
      topActions,
    };
  }

  async getDashboardData(
    actorUserId: number,
    range: ReportDateRange,
  ): Promise<ReportsDashboardData> {
    await this.assertReportsAccess(actorUserId);
    const { start, end, normalized } = this.resolveRange(range);

    const [sales, cashSessions, inventory, auditLogs] = await Promise.all([
      this.loadSales(start, end),
      this.loadCashSessions(start, end),
      this.loadInventory(),
      this.loadAuditLogs(start, end),
    ]);

    const expiringProducts = inventory.filter(
      (item) => item.status === 'expired' || item.status === 'expiring',
    );

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [currentMonthData, previousMonthData] = await Promise.all([
      this.loadMonthlySales(currentMonthStart, now),
      this.loadMonthlySales(previousMonthStart, previousMonthEnd),
    ]);

    return {
      range: normalized,
      salesSummary: this.buildSalesSummary(sales),
      sales,
      cashSessions,
      inventorySummary: this.buildInventorySummary(inventory),
      inventory,
      expiringProducts,
      auditSummary: this.buildAuditSummary(auditLogs),
      auditLogs,
      monthlyComparison: {
        current: currentMonthData,
        previous: previousMonthData,
      },
    };
  }

  private async loadMonthlySales(start: Date, end: Date): Promise<MonthlySalesData> {
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: 'COMPLETED',
      },
      select: {
        createdAt: true,
        total: true,
        debt: true,
      },
    });

    const monthLabel = start.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

    const dailyMap = new Map<number, number>();
    sales
      .filter((sale) => !sale.debt)
      .forEach((sale) => {
        const day = sale.createdAt.getDate();
        dailyMap.set(day, (dailyMap.get(day) ?? 0) + Number(sale.total));
      });

    const total = Array.from(dailyMap.values()).reduce((sum, v) => sum + v, 0);
    const dailySales = Array.from({ length: end.getDate() }, (_, i) => ({
      day: i + 1,
      total: dailyMap.get(i + 1) ?? 0,
    }));

    return {
      month: monthLabel,
      total,
      dailySales,
    };
  }

  private ensureOutputDir(): string {
    const reportsDir = path.join(app.getPath('downloads'), 'TuCajero-reportes');
    fs.mkdirSync(reportsDir, { recursive: true });
    return reportsDir;
  }

  /**
   * Despacha la generación de archivo a un Worker Thread para no bloquear el proceso principal.
   * El worker se resuelve con { success, filePath } o { success: false, error }.
   */
  private runWorker(input: WorkerInput): Promise<WorkerOutput> {
    return new Promise((resolve, reject) => {
      // En producción el worker estará en dist/main/app/main/workers/report.worker.js
      const workerPath = path.join(__dirname, '..', 'workers', 'report.worker.js');
      const worker = new Worker(workerPath);

      worker.on('message', (result: WorkerOutput) => {
        void worker.terminate();
        resolve(result);
      });

      worker.on('error', (err) => {
        void worker.terminate();
        reject(err);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker de reportes terminó con código de salida ${code}`));
        }
      });

      worker.postMessage(input);
    });
  }

  private createSheetRows(
    reportType: ReportType,
    data: ReportsDashboardData,
  ): Record<string, string | number | null>[] {
    switch (reportType) {
      case 'sales':
        return data.sales.map((sale) => ({
          venta_id: sale.id,
          numero: sale.saleNumber,
          fecha: sale.createdAt,
          cajero: sale.cashierName,
          estado: sale.status,
          items: sale.itemsCount,
          subtotal: sale.subtotal,
          iva: sale.tax,
          descuento: sale.discount,
          total: sale.total,
          pagos: sale.payments.map((payment) => `${payment.label}:${payment.value}`).join(' | '),
        }));
      case 'cashSessions':
        return data.cashSessions.map((session) => ({
          caja_id: session.id,
          cajero: session.cashierName,
          apertura: session.openedAt,
          cierre: session.closedAt,
          estado: session.status,
          efectivo_inicial: session.initialCash,
          efectivo_esperado: session.expectedCash,
          efectivo_final: session.finalCash,
          diferencia: session.difference,
          ventas: session.salesCount,
          total_ventas: session.salesTotal,
        }));
      case 'inventory':
        return data.inventory.map((item) => ({
          producto_id: item.id,
          codigo: item.code,
          barcode: item.barcode,
          nombre: item.name,
          categoria: item.categoryName,
          stock: item.stock,
          stock_minimo: item.minStock,
          stock_critico: item.criticalStock,
          costo: item.cost,
          precio: item.price,
          valor_stock: item.stockValue,
          vencimiento: item.expiryDate,
          ubicacion: item.location,
          estado: item.status,
        }));
      case 'expiring':
        return data.expiringProducts.map((item) => ({
          producto_id: item.id,
          codigo: item.code,
          nombre: item.name,
          categoria: item.categoryName,
          stock: item.stock,
          vencimiento: item.expiryDate,
          estado: item.status,
        }));
      case 'audit':
        return data.auditLogs.map((log) => ({
          log_id: log.id,
          fecha: log.createdAt,
          usuario: log.user.fullName,
          username: log.user.username,
          rol: log.user.role,
          accion: log.action,
          entidad: log.entity,
          entidad_id: log.entityId,
          detalle: log.payload,
        }));
      default:
        return [];
    }
  }

  async exportReport(
    actorUserId: number,
    reportType: ReportType,
    format: ReportFormat,
    range: ReportDateRange,
  ): Promise<ReportExportResult> {
    const data = await this.getDashboardData(actorUserId, range);
    const rows = this.createSheetRows(reportType, data);
    const dir = this.ensureOutputDir();
    const timestamp = toFileDate(new Date());
    const fileName = `${reportType}_${data.range.startDate}_${data.range.endDate}_${timestamp}.${format}`;
    const filePath = path.join(dir, fileName);

    // Delegar la generación del archivo al Worker Thread para no bloquear el proceso principal
    const workerResult = await this.runWorker({
      rows,
      format: format as 'xlsx' | 'csv',
      filePath,
      reportType,
    });

    if (!workerResult.success) {
      throw new AppError(
        ErrorCode.UNKNOWN,
        `Error al exportar reporte: ${workerResult.error ?? 'Error desconocido en el worker'}`,
      );
    }

    await auditService.log({
      userId: actorUserId,
      action: 'report:exported',
      entity: 'Report',
      payload: {
        reportType,
        format,
        dateRange: data.range,
        recordCount: rows.length,
        fileName,
      },
    });

    return {
      fileName,
      filePath,
      reportType,
      format,
      recordCount: rows.length,
      generatedAt: new Date().toISOString(),
    };
  }
}
