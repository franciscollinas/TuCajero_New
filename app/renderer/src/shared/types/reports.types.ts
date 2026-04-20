import type { AuditLogEntry } from './audit.types';

export type ReportFormat = 'csv' | 'xlsx';
export type ReportType = 'sales' | 'cashSessions' | 'inventory' | 'expiring' | 'audit';

export interface ReportDateRange {
  startDate: string;
  endDate: string;
}

export interface ReportMetric {
  label: string;
  value: number;
}

export interface SalesReportRow {
  id: number;
  saleNumber: string;
  createdAt: string;
  cashierName: string;
  status: string;
  itemsCount: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  isCredit: boolean;
  payments: ReportMetric[];
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
    cost: number;
  }>;
}

export interface CashSessionReportRow {
  id: number;
  userId: number;
  cashierName: string;
  openedAt: string;
  closedAt: string | null;
  status: string;
  initialCash: number;
  expectedCash: number | null;
  finalCash: number | null;
  difference: number | null;
  salesCount: number;
  salesTotal: number;
}

export interface InventoryReportRow {
  id: number;
  code: string;
  barcode: string | null;
  name: string;
  categoryName: string;
  stock: number;
  minStock: number;
  criticalStock: number;
  price: number;
  cost: number;
  stockValue: number;
  expiryDate: string | null;
  location: string | null;
  status: 'ok' | 'warning' | 'critical' | 'expired' | 'expiring';
}

export interface ReportsSummary {
  totalSales: number;
  completedSales: number;
  cancelledSales: number;
  grossRevenue: number;
  netRevenue: number;
  totalTax: number;
  totalDiscount: number;
  averageTicket: number;
  paymentsByMethod: ReportMetric[];
  estimatedProfit: number;
  profitMargin: number;
  previousPeriodSales: number;
  previousPeriodRevenue: number;
  previousPeriodAvgTicket: number;
}

export interface InventorySummary {
  totalProducts: number;
  totalUnits: number;
  totalStockValue: number;
  lowStockCount: number;
  criticalStockCount: number;
  expiredCount: number;
  expiringCount: number;
  noRotationCount: number;
  noRotationValue: number;
}

export interface AuditSummary {
  totalLogs: number;
  topActions: ReportMetric[];
}

export interface NoRotationProduct {
  id: number;
  code: string;
  name: string;
  categoryName: string;
  stock: number;
  cost: number;
  stockValue: number;
  daysWithoutSale: number;
}

export interface ReportsDashboardData {
  range: ReportDateRange;
  salesSummary: ReportsSummary;
  sales: SalesReportRow[];
  cashSessions: CashSessionReportRow[];
  inventorySummary: InventorySummary;
  inventory: InventoryReportRow[];
  expiringProducts: InventoryReportRow[];
  noRotationProducts: NoRotationProduct[];
  auditSummary: AuditSummary;
  auditLogs: AuditLogEntry[];
}

export interface ReportExportResult {
  fileName: string;
  filePath: string;
  reportType: ReportType;
  format: ReportFormat;
  recordCount: number;
  generatedAt: string;
}
