import { prisma } from '../repositories/prisma';

export interface ProductAlert {
  productId: number;
  productName: string;
  alertType: 'STOCK_CRITICAL' | 'STOCK_LOW' | 'EXPIRY_WARNING' | 'EXPIRY_CRITICAL' | 'EXPIRED';
  value: number;
  severity: 'RED' | 'YELLOW' | 'ORANGE';
  code: string;
  stock: number;
  minStock: number;
  criticalStock: number;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
}

function getDaysUntilExpiry(expiryDate: Date | null): number | null {
  if (!expiryDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export class AlertService {
  async getProductAlerts(): Promise<ProductAlert[]> {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        stock: true,
        minStock: true,
        criticalStock: true,
        expiryDate: true,
      },
    });

    const alerts: ProductAlert[] = [];

    for (const product of products) {
      // Stock alerts
      if (product.stock <= product.criticalStock) {
        alerts.push({
          productId: product.id,
          productName: product.name,
          code: product.code,
          alertType: 'STOCK_CRITICAL',
          value: product.stock,
          severity: 'RED',
          stock: product.stock,
          minStock: product.minStock,
          criticalStock: product.criticalStock,
          expiryDate: product.expiryDate ? product.expiryDate.toISOString() : null,
          daysUntilExpiry: getDaysUntilExpiry(product.expiryDate),
        });
      } else if (product.stock <= product.minStock) {
        alerts.push({
          productId: product.id,
          productName: product.name,
          code: product.code,
          alertType: 'STOCK_LOW',
          value: product.stock,
          severity: 'YELLOW',
          stock: product.stock,
          minStock: product.minStock,
          criticalStock: product.criticalStock,
          expiryDate: product.expiryDate ? product.expiryDate.toISOString() : null,
          daysUntilExpiry: getDaysUntilExpiry(product.expiryDate),
        });
      }

      // Expiry alerts
      const days = getDaysUntilExpiry(product.expiryDate);
      if (days !== null) {
        if (days < 0) {
          alerts.push({
            productId: product.id,
            productName: product.name,
            code: product.code,
            alertType: 'EXPIRED',
            value: days,
            severity: 'RED',
            stock: product.stock,
            minStock: product.minStock,
            criticalStock: product.criticalStock,
            expiryDate: product.expiryDate!.toISOString(),
            daysUntilExpiry: days,
          });
        } else if (days <= 30) {
          alerts.push({
            productId: product.id,
            productName: product.name,
            code: product.code,
            alertType: 'EXPIRY_CRITICAL',
            value: days,
            severity: 'ORANGE',
            stock: product.stock,
            minStock: product.minStock,
            criticalStock: product.criticalStock,
            expiryDate: product.expiryDate!.toISOString(),
            daysUntilExpiry: days,
          });
        } else if (days <= 60) {
          alerts.push({
            productId: product.id,
            productName: product.name,
            code: product.code,
            alertType: 'EXPIRY_WARNING',
            value: days,
            severity: 'YELLOW',
            stock: product.stock,
            minStock: product.minStock,
            criticalStock: product.criticalStock,
            expiryDate: product.expiryDate!.toISOString(),
            daysUntilExpiry: days,
          });
        }
      }
    }

    return alerts.sort((a, b) => {
      const severityOrder = { RED: 0, ORANGE: 1, YELLOW: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  async getAlertSummary(): Promise<{
    totalAlerts: number;
    stockCritical: number;
    stockLow: number;
    expired: number;
    expiringCritical: number;
    expiringWarning: number;
  }> {
    const alerts = await this.getProductAlerts();

    return {
      totalAlerts: alerts.length,
      stockCritical: alerts.filter((a) => a.alertType === 'STOCK_CRITICAL').length,
      stockLow: alerts.filter((a) => a.alertType === 'STOCK_LOW').length,
      expired: alerts.filter((a) => a.alertType === 'EXPIRED').length,
      expiringCritical: alerts.filter((a) => a.alertType === 'EXPIRY_CRITICAL').length,
      expiringWarning: alerts.filter((a) => a.alertType === 'EXPIRY_WARNING').length,
    };
  }
}
