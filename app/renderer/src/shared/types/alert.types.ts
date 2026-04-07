export type AlertType = 'STOCK_CRITICAL' | 'STOCK_LOW' | 'EXPIRY_WARNING' | 'EXPIRY_CRITICAL' | 'EXPIRED';
export type AlertSeverity = 'RED' | 'YELLOW' | 'ORANGE';

export interface ProductAlert {
  productId: number;
  productName: string;
  code: string;
  alertType: AlertType;
  value: number;
  severity: AlertSeverity;
  stock: number;
  minStock: number;
  criticalStock: number;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
}

export interface AlertSummary {
  totalAlerts: number;
  stockCritical: number;
  stockLow: number;
  expired: number;
  expiringCritical: number;
  expiringWarning: number;
}
