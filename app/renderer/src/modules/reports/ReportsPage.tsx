import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

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

// ===== Color Constants (TailAdmin Premium) =====
const COLORS = {
  blue: '#465fff',
  green: '#12b76a',
  orange: '#f79009',
  red: '#f04438',
  purple: '#7c3aed',
  cyan: '#06b6d4',
  gray: '#667085',
};

const PIE_COLORS = [COLORS.blue, COLORS.green, COLORS.orange, COLORS.red, COLORS.purple, COLORS.cyan];

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

// ===== Icon Components =====
function IconSales(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconRevenue(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 2V22M17 5H9.5C7.01472 5 5 7.01472 5 9.5C5 11.9853 7.01472 14 9.5 14H14.5C16.9853 14 19 16.0147 19 18.5C19 20.9853 16.9853 23 14.5 23H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconInventory(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconAudit(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7C12.1046 7 13 6.10457 13 5M9 5C9 3.89543 9.89543 3 11 3C12.1046 3 13 3.89543 13 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCalendar(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

function IconExport(props: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconChart(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M18 20V10M12 20V4M6 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconPieChart(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2V22C17.52 22 22 17.52 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconEmpty(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7C12.1046 7 13 6.10457 13 5M9 5C9 3.89543 9.89543 3 11 3C12.1046 3 13 3.89543 13 5M9 12H15M9 16H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconArrowLeft(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ===== Skeleton Loader =====
function MetricSkeleton(): JSX.Element {
  return (
    <article className="tc-metric-card" style={{ opacity: 0.7 }}>
      <div className="tc-metric-icon tc-metric-icon--brand">
        <div className="tc-skeleton tc-skeleton--circle" />
      </div>
      <div className="tc-metric-content">
        <div className="tc-skeleton tc-skeleton--text" style={{ width: '60%' }} />
        <div className="tc-skeleton tc-skeleton--title" style={{ width: '80%' }} />
      </div>
    </article>
  );
}

// ===== Empty State Component =====
function EmptyState({ message }: { message: string }): JSX.Element {
  return (
    <div
      className="animate-fadeIn"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-12) var(--space-6)',
        textAlign: 'center',
      }}
    >
      <div style={{ color: 'var(--gray-300)', marginBottom: 'var(--space-4)' }}>
        <IconEmpty />
      </div>
      <p style={{ color: 'var(--gray-500)', fontSize: 'var(--text-base)', fontWeight: 500 }}>{message}</p>
    </div>
  );
}

// ===== Custom Tooltip for BarChart =====
interface TooltipPayload {
  name?: string;
  value?: number;
  fill?: string;
  payload?: Record<string, unknown>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomBarTooltip({ active, payload }: CustomTooltipProps): JSX.Element | null {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          background: '#fff',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-light)',
        }}
      >
        <p style={{ fontWeight: 600, color: 'var(--gray-800)', marginBottom: '4px', fontSize: 'var(--text-sm)' }}>
          {String(data?.day ?? data?.name ?? '')}
        </p>
        <p style={{ color: COLORS.blue, fontWeight: 700, fontSize: 'var(--text-sm)' }}>
          {formatCurrency(payload[0].value ?? 0)}
        </p>
      </div>
    );
  }
  return null;
}

// ===== Custom Tooltip for PieChart =====
function CustomPieTooltip({ active, payload }: CustomTooltipProps): JSX.Element | null {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div
        style={{
          background: '#fff',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-light)',
        }}
      >
        <p style={{ fontWeight: 600, color: 'var(--gray-800)', marginBottom: '4px', fontSize: 'var(--text-sm)' }}>
          {String(data?.name ?? '')}
        </p>
        <p style={{ color: data?.fill, fontWeight: 700, fontSize: 'var(--text-sm)' }}>
          {formatCurrency(data?.value ?? 0)}
        </p>
      </div>
    );
  }
  return null;
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
      {
        label: es.reports.totalSales,
        value: String(data.salesSummary.completedSales),
        icon: <IconSales />,
        color: 'brand',
      },
      {
        label: es.reports.netRevenue,
        value: formatCurrency(data.salesSummary.netRevenue),
        icon: <IconRevenue />,
        color: 'success',
      },
      {
        label: es.reports.inventoryValue,
        value: formatCurrency(data.inventorySummary.totalStockValue),
        icon: <IconInventory />,
        color: 'warning',
      },
      {
        label: es.reports.auditRecords,
        value: String(data.auditSummary.totalLogs),
        icon: <IconAudit />,
        color: 'danger',
      },
    ];
  }, [data]);

  // Prepare data for BarChart (sales by day)
  const salesByDayData = useMemo(() => {
    if (!data || data.sales.length === 0) return [];

    const dayMap = new Map<string, number>();
    data.sales.forEach((sale) => {
      const date = new Date(sale.createdAt);
      const dayKey = date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
      dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + sale.total);
    });

    return Array.from(dayMap.entries())
      .slice(0, 7)
      .map(([day, total]) => ({ day, total }));
  }, [data]);

  // Prepare data for PieChart (payment methods)
  const paymentMethodsData = useMemo(() => {
    if (!data || !data.salesSummary.paymentsByMethod || data.salesSummary.paymentsByMethod.length === 0) return [];

    return data.salesSummary.paymentsByMethod.map((metric) => ({
      name: metric.label,
      value: metric.value,
    }));
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
    <div className="animate-fadeIn">
      {/* ===== Premium Page Header ===== */}
      <div
        className="animate-slideDown"
        style={{
          background: 'linear-gradient(135deg, #465fff 0%, #7c3aed 100%)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-8)',
          marginBottom: 'var(--space-6)',
          boxShadow: '0 12px 24px rgba(70, 95, 255, 0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative background element */}
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div>
              <p
                style={{
                  margin: 0,
                  color: 'rgba(255, 255, 255, 0.85)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginBottom: 'var(--space-2)',
                }}
              >
                {es.reports.title}
              </p>
              <h1
                style={{
                  margin: 0,
                  fontSize: 'var(--text-3xl)',
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                {es.reports.title}
              </h1>
              <p
                style={{
                  margin: 0,
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: 'var(--text-base)',
                  marginTop: 'var(--space-2)',
                  maxWidth: '600px',
                }}
              >
                {es.reports.subtitle}
              </p>
            </div>
            <Link to="/dashboard" className="tc-btn tc-btn--secondary" style={{ background: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.3)', color: '#fff' }}>
              <IconArrowLeft />
              {es.dashboard.title}
            </Link>
          </div>
        </div>
      </div>

      {/* ===== Date Range Filter Card ===== */}
      <section
        className="tc-section animate-slideUp"
        style={{ marginBottom: 'var(--space-6)' }}
      >
        <div className="tc-section-header">
          <div>
            <h2 className="tc-section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <IconCalendar style={{ color: COLORS.blue }} />
              Filtrar por fecha
            </h2>
            <p className="tc-section-subtitle">Selecciona el rango de fechas para consultar reportes</p>
          </div>
        </div>
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
        {message ? (
          <div className="tc-notice tc-notice--info" style={{ marginTop: 'var(--space-4)' }}>
            {message}
          </div>
        ) : null}
      </section>

      {/* ===== Loading State ===== */}
      {loading ? (
        <section className="tc-section animate-fadeIn" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="tc-grid-4">
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </div>
        </section>
      ) : null}

      {/* ===== Data Loaded ===== */}
      {!loading && data ? (
        <>
          {/* ===== Metric Cards with Gradients & Icons ===== */}
          <div
            className="tc-grid-4 animate-slideUp"
            style={{ marginBottom: 'var(--space-6)' }}
          >
            {summaryCards.map((card, index) => (
              <article
                key={card.label}
                className={`tc-metric-card tc-metric-card--${card.color}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`tc-metric-icon tc-metric-icon--${card.color}`}>
                  {card.icon}
                </div>
                <div className="tc-metric-content">
                  <p className="tc-metric-label">{card.label}</p>
                  <p className="tc-metric-value">{card.value}</p>
                </div>
              </article>
            ))}
          </div>

          {/* ===== Charts Section ===== */}
          <div className="tc-grid-2" style={{ marginBottom: 'var(--space-6)' }}>
            {/* BarChart - Sales by Day */}
            <section
              className="tc-section tc-chart-container animate-slideUp"
              style={{ animationDelay: '200ms' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                <IconChart style={{ color: COLORS.blue }} />
                <h3 className="tc-chart-title">Ventas por dia</h3>
              </div>
              <p className="tc-chart-subtitle">Distribucion de ingresos en el periodo seleccionado</p>
              {salesByDayData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={salesByDayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: COLORS.gray }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: COLORS.gray }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar
                      dataKey="total"
                      fill="url(#blueGradient)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                    />
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.blue} />
                        <stop offset="100%" stopColor="#3641f5" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No hay datos de ventas para este periodo" />
              )}
            </section>

            {/* PieChart - Payment Methods Mix */}
            <section
              className="tc-section tc-chart-container animate-slideUp"
              style={{ animationDelay: '300ms' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                <IconPieChart style={{ color: COLORS.green }} />
                <h3 className="tc-chart-title">{es.reports.paymentMix}</h3>
              </div>
              <p className="tc-chart-subtitle">Distribucion de pagos por metodo</p>
              {paymentMethodsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={paymentMethodsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                      outerRadius={90}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                      strokeWidth={3}
                      stroke="#fff"
                    >
                      {paymentMethodsData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      formatter={(value) => <span style={{ color: 'var(--gray-700)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No hay datos de pagos para este periodo" />
              )}
            </section>
          </div>

          {/* ===== Sales Section ===== */}
          <ReportSection
            title={es.reports.salesSection}
            subtitle={`${es.reports.totalSales}: ${data.salesSummary.completedSales} · ${es.reports.paymentMix}: ${renderMetricList(data.salesSummary.paymentsByMethod)}`}
            exporting={exporting}
            reportType="sales"
            onExport={handleExport}
            icon={<IconSales style={{ color: COLORS.blue }} />}
          >
            <SalesTable rows={data.sales.slice(0, 12)} />
          </ReportSection>

          {/* ===== Cash Sessions Section ===== */}
          <ReportSection
            title={es.reports.cashSection}
            subtitle={`${es.reports.sessions}: ${data.cashSessions.length}`}
            exporting={exporting}
            reportType="cashSessions"
            onExport={handleExport}
            icon={<IconRevenue style={{ color: COLORS.green }} />}
          >
            <CashSessionsTable rows={data.cashSessions.slice(0, 12)} />
          </ReportSection>

          {/* ===== Inventory Section ===== */}
          <ReportSection
            title={es.reports.inventorySection}
            subtitle={`${es.reports.products}: ${data.inventorySummary.totalProducts} · ${es.reports.lowStock}: ${data.inventorySummary.lowStockCount} · ${es.reports.criticalStock}: ${data.inventorySummary.criticalStockCount}`}
            exporting={exporting}
            reportType="inventory"
            onExport={handleExport}
            icon={<IconInventory style={{ color: COLORS.orange }} />}
          >
            <InventoryTable rows={data.inventory.slice(0, 12)} />
          </ReportSection>

          {/* ===== Expiring Products Section ===== */}
          <ReportSection
            title={es.reports.expiringSection}
            subtitle={`${es.reports.expiringCount}: ${data.inventorySummary.expiringCount} · ${es.reports.expiredCount}: ${data.inventorySummary.expiredCount}`}
            exporting={exporting}
            reportType="expiring"
            onExport={handleExport}
            icon={<IconInventory style={{ color: COLORS.red }} />}
          >
            <InventoryTable rows={data.expiringProducts.slice(0, 12)} />
          </ReportSection>

          {/* ===== Audit Section ===== */}
          <ReportSection
            title={es.reports.auditSection}
            subtitle={`${es.reports.auditRecords}: ${data.auditSummary.totalLogs} · ${es.reports.topActions}: ${renderMetricList(data.auditSummary.topActions)}`}
            exporting={exporting}
            reportType="audit"
            onExport={handleExport}
            icon={<IconAudit style={{ color: COLORS.purple }} />}
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

      {/* ===== No Data State ===== */}
      {!loading && !data && !message ? (
        <section className="tc-section animate-fadeIn">
          <EmptyState message={es.reports.noData} />
        </section>
      ) : null}
    </div>
  );
}

// ===== ReportSection Component with Icon =====
function ReportSection({
  children,
  exporting,
  icon,
  onExport,
  reportType,
  subtitle,
  title,
}: {
  children: JSX.Element;
  exporting: string;
  icon: JSX.Element;
  onExport: (reportType: ReportType, format: ReportFormat) => Promise<void>;
  reportType: ReportType;
  subtitle: string;
  title: string;
}): JSX.Element {
  return (
    <section className="tc-section animate-slideUp" style={{ marginBottom: 'var(--space-6)' }}>
      <div className="tc-section-header">
        <div>
          <h2 className="tc-section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {icon}
            {title}
          </h2>
          <p className="tc-section-subtitle">{subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="tc-btn tc-btn--secondary"
            onClick={() => void onExport(reportType, 'csv')}
            disabled={exporting.length > 0}
          >
            <IconExport />
            {exporting === `${reportType}:csv` ? es.reports.exporting : es.reports.exportCsv}
          </button>
          <button
            type="button"
            className="tc-btn tc-btn--primary"
            onClick={() => void onExport(reportType, 'xlsx')}
            disabled={exporting.length > 0}
          >
            <IconExport />
            {exporting === `${reportType}:xlsx` ? es.reports.exporting : es.reports.exportXlsx}
          </button>
        </div>
      </div>
      {children}
    </section>
  );
}

// ===== SalesTable Component =====
function SalesTable({ rows }: { rows: SalesReportRow[] }): JSX.Element {
  if (rows.length === 0) {
    return <EmptyState message={es.reports.noData} />;
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
              <td style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{sale.saleNumber}</td>
              <td>{formatDate(sale.createdAt)}</td>
              <td>{sale.cashierName}</td>
              <td>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--brand-50)',
                    color: 'var(--brand-600)',
                    fontWeight: 600,
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  {sale.itemsCount}
                </span>
              </td>
              <td style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{formatCurrency(sale.total)}</td>
              <td style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>{renderMetricList(sale.payments)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===== CashSessionsTable Component =====
function CashSessionsTable({ rows }: { rows: CashSessionReportRow[] }): JSX.Element {
  if (rows.length === 0) {
    return <EmptyState message={es.reports.noData} />;
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
              <td>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--gray-100)',
                    color: 'var(--gray-700)',
                    fontWeight: 600,
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  #{session.id}
                </span>
              </td>
              <td>{session.cashierName}</td>
              <td>{formatDate(session.openedAt)}</td>
              <td>{formatDate(session.closedAt)}</td>
              <td style={{ textAlign: 'center' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--success-100)',
                    color: 'var(--success-600)',
                    fontWeight: 600,
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  {session.salesCount}
                </span>
              </td>
              <td style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{formatCurrency(session.salesTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===== InventoryTable Component =====
function InventoryTable({ rows }: { rows: InventoryReportRow[] }): JSX.Element {
  if (rows.length === 0) {
    return <EmptyState message={es.reports.noData} />;
  }

  const getStatusBadge = (status: string): JSX.Element => {
    let badgeClass = 'tc-badge tc-badge--neutral';
    if (status.toLowerCase().includes('critic') || status.toLowerCase().includes('bajo')) {
      badgeClass = 'tc-badge tc-badge--danger';
    } else if (status.toLowerCase().includes('bajo') || status.toLowerCase().includes('medium')) {
      badgeClass = 'tc-badge tc-badge--warning';
    } else if (status.toLowerCase().includes('ok') || status.toLowerCase().includes('normal')) {
      badgeClass = 'tc-badge tc-badge--success';
    }

    return <span className={badgeClass}>{status}</span>;
  };

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
              <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--gray-800)' }}>{item.code}</td>
              <td style={{ fontWeight: 500 }}>{item.name}</td>
              <td>{item.categoryName}</td>
              <td>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--brand-50)',
                    color: 'var(--brand-600)',
                    fontWeight: 600,
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  {item.stock}
                </span>
              </td>
              <td style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{formatCurrency(item.price)}</td>
              <td>{formatDate(item.expiryDate)}</td>
              <td>{getStatusBadge(item.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
