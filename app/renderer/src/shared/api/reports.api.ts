import type { ApiResponse } from '../types/api.types';
import type {
  ReportDateRange,
  ReportExportResult,
  ReportFormat,
  ReportsDashboardData,
  ReportType,
} from '../types/reports.types';

export function getReportsDashboardData(
  actorUserId: number,
  range: ReportDateRange,
): Promise<ApiResponse<ReportsDashboardData>> {
  return window.api.invoke<ReportsDashboardData>('reports:getDashboardData', actorUserId, range);
}

export function exportReport(
  actorUserId: number,
  reportType: ReportType,
  format: ReportFormat,
  range: ReportDateRange,
): Promise<ApiResponse<ReportExportResult>> {
  return window.api.invoke<ReportExportResult>('reports:export', actorUserId, reportType, format, range);
}
