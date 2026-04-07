import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { exportReport, getReportsDashboardData } from '../../shared/api/reports.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import type {
  CashSessionReportRow,
  InventoryReportRow,
  ReportDateRange,
  ReportFormat,
  ReportMetric,
  ReportsDashboardData,
  ReportType,
  SalesReportRow,
} from '../../shared/types/reports.types';

function toInputDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function buildDefaultRange(): ReportDateRange {
  const now = new Date();
  return {
    startDate: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: toInputDate(now),
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return es.reports.notAvailable;
  }

  return new Date(value).toLocaleString('es-CO');
}

function renderMetricList(metrics: ReportMetric[]): string {
  if (metrics.length === 0) {
    return es.reports.noData;
  }

  return metrics.map((metric) => `${metric.label}: ${formatCurrency(metric.value)}`).join(' · ');
}

export function ReportsPage(): JSX.Element {
  const { user } = useAuth();
  const [range, setRange] = useState<ReportDateRange>(() => buildDefaultRange());
  const [data, setData] = useState<ReportsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState('');

  useEffect((): (() => void) => {
    let cancelled = false;

    const loadData = async (): Promise<void> => {
      if (!user) {
        return;
      }

      setLoading(true);
      setMessage('');

      const response = await getReportsDashboardData(user.id, range);

      if (cancelled) {
        return;
      }

      if (response.success) {
        setData(response.data);
      } else {
        setData(null);
        setMessage(response.error.message);
      }

      setLoading(false);
    };

    void loadData();

    return (): void => {
      cancelled = true;
    };
  }, [range, user]);

  const summaryCards = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      { label: es.reports.totalSales, value: String(data.salesSummary.completedSales) },
      { label: es.reports.netRevenue, value: formatCurrency(data.salesSummary.netRevenue) },
      { label: es.reports.inventoryValue, value: formatCurrency(data.inventorySummary.totalStockValue) },
      { label: es.reports.auditRecords, value: String(data.auditSummary.totalLogs) },
    ];
  }, [data]);

  const handleExport = async (reportType: ReportType, format: ReportFormat): Promise<void> => {
    if (!user) {
      return;
    }

    const exportKey = `${reportType}:${format}`;
    setExporting(exportKey);
    setMessage('');

    const response = await exportReport(user.id, reportType, format, range);

    if (response.success) {
      setMessage(es.reports.exportSuccess.replace('{filePath}', response.data.filePath));
    } else {
      setMessage(response.error.message);
    }

    setExporting('');
  };

  return (
    <>
      <div className="tc-section-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--brand-600)', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', fontWeight: 700 }}>{es.reports.title}</p>
          <h1 className="tc-section-title">{es.reports.title}</h1>
          <p className="tc-section-subtitle">{es.reports.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/dashboard" className="tc-btn tc-btn--secondary">
            {es.dashboard.title}
          </Link>
        </div>
      </div>

      <section className="tc-section">
        <div className="tc-grid-form">
          <label className="tc-field">
            <span className="tc-label">{es.reports.startDate}</span>
            <input
              type="date"
              className="tc-input"
              value={range.startDate}
              onChange={(event) => setRange((current) => ({ ...current, startDate: event.target.value }))}
            />
          </label>
          <label className="tc-field">
            <span className="tc-label">{es.reports.endDate}</span>
            <input
              type="date"
              className="tc-input"
              value={range.endDate}
              onChange={(event) => setRange((current) => ({ ...current, endDate: event.target.value }))}
            />
          </label>
        </div>
        {message ? <div className="tc-notice tc-notice--info">{message}</div> : null}
      </section>

      {loading ? (
        <section className="tc-section">
          <p style={{ color: 'var(--gray-500)' }}>{es.common.loading}</p>
        </section>
      ) : null}

      {!loading && data ? (
        <>
          <div className="tc-grid-4" style={{ marginBottom: 'var(--space-4)' }}>
            {summaryCards.map((card) => (
              <article key={card.label} className="tc-metric-card">
                <div className="tc-metric-content">
                  <p className="tc-metric-label">{card.label}</p>
                  <p className="tc-metric-value">{card.value}</p>
                </div>
              </article>
            ))}
          </div>

          <ReportSection
            title={es.reports.salesSection}
            subtitle={`${es.reports.totalSales}: ${data.salesSummary.totalSales} · ${es.reports.paymentMix}: ${renderMetricList(data.salesSummary.paymentsByMethod)}`}
            exporting={exporting}
            reportType="sales"
            onExport={handleExport}
          >
            <SalesTable rows={data.sales.slice(0, 12)} />
          </ReportSection>

          <ReportSection
            title={es.reports.cashSection}
            subtitle={`${es.reports.sessions}: ${data.cashSessions.length}`}
            exporting={exporting}
            reportType="cashSessions"
            onExport={handleExport}
          >
            <CashSessionsTable rows={data.cashSessions.slice(0, 12)} />
          </ReportSection>

          <ReportSection
            title={es.reports.inventorySection}
            subtitle={`${es.reports.products}: ${data.inventorySummary.totalProducts} · ${es.reports.lowStock}: ${data.inventorySummary.lowStockCount} · ${es.reports.criticalStock}: ${data.inventorySummary.criticalStockCount}`}
            exporting={exporting}
            reportType="inventory"
            onExport={handleExport}
          >
            <InventoryTable rows={data.inventory.slice(0, 12)} />
          </ReportSection>

          <ReportSection
            title={es.reports.expiringSection}
            subtitle={`${es.reports.expiringCount}: ${data.inventorySummary.expiringCount} · ${es.reports.expiredCount}: ${data.inventorySummary.expiredCount}`}
            exporting={exporting}
            reportType="expiring"
            onExport={handleExport}
          >
            <InventoryTable rows={data.expiringProducts.slice(0, 12)} />
          </ReportSection>

          <ReportSection
            title={es.reports.auditSection}
            subtitle={`${es.reports.auditRecords}: ${data.auditSummary.totalLogs} · ${es.reports.topActions}: ${renderMetricList(data.auditSummary.topActions)}`}
            exporting={exporting}
            reportType="audit"
            onExport={handleExport}
          >
            <div className="tc-table-wrap">
              <table className="tc-table">
                <thead>
                  <tr>
                    <th>{es.audit.date}</th>
                    <th>{es.audit.user}</th>
                    <th>{es.audit.action}</th>
                    <th>{es.audit.entity}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.auditLogs.slice(0, 15).map((log) => (
                    <tr key={log.id}>
                      <td>{formatDate(log.createdAt)}</td>
                      <td>{log.user.fullName}</td>
                      <td>{log.action}</td>
                      <td>
                        {log.entity}
                        {log.entityId ? ` #${log.entityId}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>
        </>
      ) : null}
    </>
  );
}

function ReportSection({
  children,
  exporting,
  onExport,
  reportType,
  subtitle,
  title,
}: {
  children: JSX.Element;
  exporting: string;
  onExport: (reportType: ReportType, format: ReportFormat) => Promise<void>;
  reportType: ReportType;
  subtitle: string;
  title: string;
}): JSX.Element {
  return (
    <section className="tc-section">
      <div className="tc-section-header">
        <div>
          <h2 className="tc-section-title">{title}</h2>
          <p className="tc-section-subtitle">{subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="tc-btn tc-btn--secondary"
            onClick={() => void onExport(reportType, 'csv')}
            disabled={exporting.length > 0}
          >
            {exporting === `${reportType}:csv` ? es.reports.exporting : es.reports.exportCsv}
          </button>
          <button
            type="button"
            className="tc-btn tc-btn--primary"
            onClick={() => void onExport(reportType, 'xlsx')}
            disabled={exporting.length > 0}
          >
            {exporting === `${reportType}:xlsx` ? es.reports.exporting : es.reports.exportXlsx}
          </button>
        </div>
      </div>
      {children}
    </section>
  );
}

function SalesTable({ rows }: { rows: SalesReportRow[] }): JSX.Element {
  if (rows.length === 0) {
    return <p style={{ color: 'var(--gray-500)' }}>{es.reports.noData}</p>;
  }

  return (
    <div className="tc-table-wrap">
      <table className="tc-table">
        <thead>
          <tr>
            <th>{es.sales.saleNumber}</th>
            <th>{es.audit.date}</th>
            <th>{es.audit.user}</th>
            <th>{es.reports.items}</th>
            <th>{es.sales.totalLabel}</th>
            <th>{es.reports.paymentMix}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((sale) => (
            <tr key={sale.id}>
              <td>{sale.saleNumber}</td>
              <td>{formatDate(sale.createdAt)}</td>
              <td>{sale.cashierName}</td>
              <td>{sale.itemsCount}</td>
              <td>{formatCurrency(sale.total)}</td>
              <td>{renderMetricList(sale.payments)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CashSessionsTable({ rows }: { rows: CashSessionReportRow[] }): JSX.Element {
  if (rows.length === 0) {
    return <p style={{ color: 'var(--gray-500)' }}>{es.reports.noData}</p>;
  }

  return (
    <div className="tc-table-wrap">
      <table className="tc-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>{es.audit.user}</th>
            <th>{es.reports.openedAt}</th>
            <th>{es.reports.closedAt}</th>
            <th>{es.reports.sessions}</th>
            <th>{es.sales.totalLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((session) => (
            <tr key={session.id}>
              <td>#{session.id}</td>
              <td>{session.cashierName}</td>
              <td>{formatDate(session.openedAt)}</td>
              <td>{formatDate(session.closedAt)}</td>
              <td>{session.salesCount}</td>
              <td>{formatCurrency(session.salesTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryTable({ rows }: { rows: InventoryReportRow[] }): JSX.Element {
  if (rows.length === 0) {
    return <p style={{ color: 'var(--gray-500)' }}>{es.reports.noData}</p>;
  }

  return (
    <div className="tc-table-wrap">
      <table className="tc-table">
        <thead>
          <tr>
            <th>{es.inventory.code}</th>
            <th>{es.inventory.name}</th>
            <th>{es.inventory.category}</th>
            <th>{es.inventory.stock}</th>
            <th>{es.inventory.price}</th>
            <th>{es.inventory.expiryDate}</th>
            <th>{es.inventory.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>{item.code}</td>
              <td>{item.name}</td>
              <td>{item.categoryName}</td>
              <td>{item.stock}</td>
              <td>{formatCurrency(item.price)}</td>
              <td>{formatDate(item.expiryDate)}</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
