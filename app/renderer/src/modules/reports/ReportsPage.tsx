import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { exportReport, getReportsDashboardData } from '../../shared/api/reports.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';
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
    <main style={pageStyle}>
      <section style={shellStyle}>
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>{es.reports.title}</p>
            <h1 style={titleStyle}>{es.reports.title}</h1>
            <p style={subtleStyle}>{es.reports.subtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/dashboard" style={secondaryLinkStyle}>
              {es.dashboard.title}
            </Link>
          </div>
        </header>

        <section style={panelStyle}>
          <div style={filtersGridStyle}>
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>{es.reports.startDate}</span>
              <input
                type="date"
                value={range.startDate}
                onChange={(event) => setRange((current) => ({ ...current, startDate: event.target.value }))}
                style={inputStyle}
              />
            </label>
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>{es.reports.endDate}</span>
              <input
                type="date"
                value={range.endDate}
                onChange={(event) => setRange((current) => ({ ...current, endDate: event.target.value }))}
                style={inputStyle}
              />
            </label>
          </div>
          {message ? <div style={noticeStyle}>{message}</div> : null}
        </section>

        {loading ? (
          <section style={panelStyle}>
            <p style={subtleStyle}>{es.common.loading}</p>
          </section>
        ) : null}

        {!loading && data ? (
          <>
            <section style={summaryGridStyle}>
              {summaryCards.map((card) => (
                <article key={card.label} style={cardStyle}>
                  <p style={eyebrowStyle}>{card.label}</p>
                  <p style={cardValueStyle}>{card.value}</p>
                </article>
              ))}
            </section>

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
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{es.audit.date}</th>
                      <th style={thStyle}>{es.audit.user}</th>
                      <th style={thStyle}>{es.audit.action}</th>
                      <th style={thStyle}>{es.audit.entity}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.auditLogs.slice(0, 15).map((log) => (
                      <tr key={log.id}>
                        <td style={tdStyle}>{formatDate(log.createdAt)}</td>
                        <td style={tdStyle}>{log.user.fullName}</td>
                        <td style={tdStyle}>{log.action}</td>
                        <td style={tdStyle}>
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
      </section>
    </main>
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
    <section style={panelStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={sectionTitleStyle}>{title}</h2>
          <p style={subtleStyle}>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void onExport(reportType, 'csv')}
            style={secondaryButtonStyle}
            disabled={exporting.length > 0}
          >
            {exporting === `${reportType}:csv` ? es.reports.exporting : es.reports.exportCsv}
          </button>
          <button
            type="button"
            onClick={() => void onExport(reportType, 'xlsx')}
            style={primaryButtonStyle}
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
    return <p style={subtleStyle}>{es.reports.noData}</p>;
  }

  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{es.sales.saleNumber}</th>
            <th style={thStyle}>{es.audit.date}</th>
            <th style={thStyle}>{es.audit.user}</th>
            <th style={thStyle}>{es.reports.items}</th>
            <th style={thStyle}>{es.sales.totalLabel}</th>
            <th style={thStyle}>{es.reports.paymentMix}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((sale) => (
            <tr key={sale.id}>
              <td style={tdStyle}>{sale.saleNumber}</td>
              <td style={tdStyle}>{formatDate(sale.createdAt)}</td>
              <td style={tdStyle}>{sale.cashierName}</td>
              <td style={tdStyle}>{sale.itemsCount}</td>
              <td style={tdStyle}>{formatCurrency(sale.total)}</td>
              <td style={tdStyle}>{renderMetricList(sale.payments)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CashSessionsTable({ rows }: { rows: CashSessionReportRow[] }): JSX.Element {
  if (rows.length === 0) {
    return <p style={subtleStyle}>{es.reports.noData}</p>;
  }

  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>{es.audit.user}</th>
            <th style={thStyle}>{es.reports.openedAt}</th>
            <th style={thStyle}>{es.reports.closedAt}</th>
            <th style={thStyle}>{es.reports.sessions}</th>
            <th style={thStyle}>{es.sales.totalLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((session) => (
            <tr key={session.id}>
              <td style={tdStyle}>#{session.id}</td>
              <td style={tdStyle}>{session.cashierName}</td>
              <td style={tdStyle}>{formatDate(session.openedAt)}</td>
              <td style={tdStyle}>{formatDate(session.closedAt)}</td>
              <td style={tdStyle}>{session.salesCount}</td>
              <td style={tdStyle}>{formatCurrency(session.salesTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryTable({ rows }: { rows: InventoryReportRow[] }): JSX.Element {
  if (rows.length === 0) {
    return <p style={subtleStyle}>{es.reports.noData}</p>;
  }

  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{es.inventory.code}</th>
            <th style={thStyle}>{es.inventory.name}</th>
            <th style={thStyle}>{es.inventory.category}</th>
            <th style={thStyle}>{es.inventory.stock}</th>
            <th style={thStyle}>{es.inventory.price}</th>
            <th style={thStyle}>{es.inventory.expiryDate}</th>
            <th style={thStyle}>{es.inventory.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td style={tdStyle}>{item.code}</td>
              <td style={tdStyle}>{item.name}</td>
              <td style={tdStyle}>{item.categoryName}</td>
              <td style={tdStyle}>{item.stock}</td>
              <td style={tdStyle}>{formatCurrency(item.price)}</td>
              <td style={tdStyle}>{formatDate(item.expiryDate)}</td>
              <td style={tdStyle}>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: tokens.spacing[6],
  background:
    'radial-gradient(circle at top left, rgba(22, 163, 74, 0.08), transparent 24%), linear-gradient(180deg, #FAFAF9 0%, #F3F4F6 52%, #E5E7EB 100%)',
};
const shellStyle: CSSProperties = { maxWidth: 1360, margin: '0 auto', display: 'grid', gap: tokens.spacing[5] };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.md };
const eyebrowStyle: CSSProperties = { margin: 0, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', fontWeight: 700 };
const titleStyle: CSSProperties = { margin: '6px 0 0', fontSize: '32px', color: '#111827' };
const subtleStyle: CSSProperties = { margin: '8px 0 0', color: '#6B7280' };
const panelStyle: CSSProperties = { padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.sm, display: 'grid', gap: '16px' };
const filtersGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 280px))', gap: '16px' };
const fieldStyle: CSSProperties = { display: 'grid', gap: '8px' };
const fieldLabelStyle: CSSProperties = { fontWeight: 700, color: '#111827' };
const inputStyle: CSSProperties = { minHeight: '46px', borderRadius: '12px', border: '1px solid #D1D5DB', padding: '0 14px', fontSize: '15px' };
const summaryGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' };
const cardStyle: CSSProperties = { padding: '20px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.sm, border: '1px solid #E5E7EB' };
const cardValueStyle: CSSProperties = { margin: '8px 0 0', fontSize: '28px', fontWeight: 700, color: '#111827' };
const tableWrapStyle: CSSProperties = { overflowX: 'auto', borderRadius: '16px', border: '1px solid #E5E7EB' };
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: CSSProperties = { textAlign: 'left', padding: '14px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' };
const tdStyle: CSSProperties = { padding: '14px', borderBottom: '1px solid #F3F4F6', verticalAlign: 'top', color: '#111827' };
const noticeStyle: CSSProperties = { padding: '12px 16px', borderRadius: '12px', background: '#F0FDFA', border: '1px solid #99F6E4', color: '#0F766E' };
const sectionHeaderStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' };
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: '24px', color: '#111827' };
const primaryButtonStyle: CSSProperties = { minHeight: '44px', padding: '0 16px', borderRadius: '12px', border: 'none', background: '#0F766E', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' };
const secondaryButtonStyle: CSSProperties = { minHeight: '44px', padding: '0 16px', borderRadius: '12px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#111827', fontWeight: 700, cursor: 'pointer' };
const secondaryLinkStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '46px', padding: '0 16px', borderRadius: '12px', border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#111827', textDecoration: 'none', fontWeight: 700 };
