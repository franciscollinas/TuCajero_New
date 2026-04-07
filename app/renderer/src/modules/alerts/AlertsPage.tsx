import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { getAlertSummary, getProductAlerts } from '../../shared/api/alert.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';
import type { AlertSummary, ProductAlert } from '../../shared/types/alert.types';

function formatDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-CO');
}

function severityBadge(severity: ProductAlert['severity']): CSSProperties {
  const map = {
    RED: { background: '#FEE2E2', color: '#991B1B' },
    ORANGE: { background: '#FFF7ED', color: '#C2410C' },
    YELLOW: { background: '#FEFCE8', color: '#854D0E' },
  };
  const style = map[severity];
  return {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
    background: style.background,
    color: style.color,
  };
}

function alertTypeLabel(type: ProductAlert['alertType']): string {
  const map: Record<ProductAlert['alertType'], string> = {
    STOCK_CRITICAL: es.alerts.stockCritical,
    STOCK_LOW: es.alerts.stockLow,
    EXPIRED: es.alerts.expired,
    EXPIRY_CRITICAL: es.alerts.expiringCritical,
    EXPIRY_WARNING: es.alerts.expiringWarning,
  };
  return map[type];
}

export function AlertsPage(): JSX.Element {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<ProductAlert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadData = async (): Promise<void> => {
      setLoading(true);
      const [alertsRes, summaryRes] = await Promise.all([
        getProductAlerts(),
        getAlertSummary(),
      ]);

      if (!cancelled) {
        if (alertsRes.success) setAlerts(alertsRes.data);
        if (summaryRes.success) setSummary(summaryRes.data);
      }
      setLoading(false);
    };

    void loadData();
    return (): void => {
      cancelled = true;
    };
  }, [user]);

  return (
    <main style={pageStyle}>
      <section style={shellStyle}>
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>{es.alerts.title}</p>
            <h1 style={titleStyle}>{es.alerts.title}</h1>
            <p style={subtleStyle}>{es.alerts.subtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/dashboard" style={secondaryLinkStyle}>
              {es.dashboard.title}
            </Link>
            <Link to="/inventory" style={secondaryLinkStyle}>
              {es.inventory.title}
            </Link>
          </div>
        </header>

        {loading ? (
          <section style={panelStyle}>
            <p style={subtleStyle}>{es.common.loading}</p>
          </section>
        ) : (
          <>
            {/* Summary cards */}
            {summary && (
              <section style={summaryGridStyle}>
                {[
                  { label: es.alerts.totalAlerts, value: summary.totalAlerts, color: '#2563EB' },
                  { label: es.alerts.stockCritical, value: summary.stockCritical, color: '#DC2626' },
                  { label: es.alerts.stockLow, value: summary.stockLow, color: '#D97706' },
                  { label: es.alerts.expired, value: summary.expired, color: '#7C2D12' },
                  { label: es.alerts.expiringCritical, value: summary.expiringCritical, color: '#EA580C' },
                  { label: es.alerts.expiringWarning, value: summary.expiringWarning, color: '#0F766E' },
                ].map((card) => (
                  <article key={card.label} style={summaryCardStyle(card.color)}>
                    <p style={summaryCardLabelStyle}>{card.label}</p>
                    <p style={summaryCardValueStyle}>{card.value}</p>
                  </article>
                ))}
              </section>
            )}

            {/* Alerts table */}
            <section style={panelStyle}>
              <h2 style={sectionTitleStyle}>{es.alerts.title}</h2>
              {alerts.length === 0 ? (
                <p style={subtleStyle}>{es.alerts.noAlerts}</p>
              ) : (
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>{es.alerts.severity}</th>
                        <th style={thStyle}>{es.alerts.type}</th>
                        <th style={thStyle}>{es.alerts.product}</th>
                        <th style={thStyle}>{es.alerts.code}</th>
                        <th style={thStyle}>{es.alerts.stock}</th>
                        <th style={thStyle}>{es.alerts.minStock}</th>
                        <th style={thStyle}>{es.alerts.expiryDate}</th>
                        <th style={thStyle}>{es.alerts.daysUntil}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map((alert) => (
                        <tr key={`${alert.productId}-${alert.alertType}`}>
                          <td style={tdStyle}>
                            <span style={severityBadge(alert.severity)}>
                              {alert.severity}
                            </span>
                          </td>
                          <td style={tdStyle}>{alertTypeLabel(alert.alertType)}</td>
                          <td style={tdStyle}>{alert.productName}</td>
                          <td style={tdStyle}>{alert.code}</td>
                          <td style={tdStyle}>{alert.stock}</td>
                          <td style={tdStyle}>{alert.minStock}</td>
                          <td style={tdStyle}>{formatDate(alert.expiryDate)}</td>
                          <td style={tdStyle}>
                            {alert.daysUntilExpiry !== null
                              ? alert.daysUntilExpiry < 0
                                ? `Vencido hace ${Math.abs(alert.daysUntilExpiry)} días`
                                : `${alert.daysUntilExpiry} días`
                              : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: tokens.spacing[6],
  background:
    'radial-gradient(circle at top left, rgba(22, 163, 74, 0.08), transparent 24%), linear-gradient(180deg, #FAFAF9 0%, #F3F4F6 52%, #E5E7EB 100%)',
};
const shellStyle: CSSProperties = { maxWidth: 1200, margin: '0 auto', display: 'grid', gap: tokens.spacing[5] };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.md };
const eyebrowStyle: CSSProperties = { margin: 0, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', fontWeight: 700 };
const titleStyle: CSSProperties = { margin: '6px 0 0', fontSize: '32px', color: '#111827' };
const subtleStyle: CSSProperties = { margin: '8px 0 0', color: '#6B7280' };
const panelStyle: CSSProperties = { padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.sm, display: 'grid', gap: '16px' };
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: '24px', color: '#111827' };
const summaryGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' };
const summaryCardStyle = (color: string): CSSProperties => ({
  padding: '16px',
  borderRadius: '14px',
  background: '#FFFFFF',
  border: `1px solid ${color}30`,
  boxShadow: tokens.shadows.sm,
});
const summaryCardLabelStyle: CSSProperties = { margin: 0, fontSize: '13px', color: '#6B7280', fontWeight: 600 };
const summaryCardValueStyle: CSSProperties = { margin: '6px 0 0', fontSize: '28px', fontWeight: 800, color: '#111827' };
const tableWrapStyle: CSSProperties = { overflowX: 'auto', borderRadius: '16px', border: '1px solid #E5E7EB' };
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: CSSProperties = { textAlign: 'left', padding: '14px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' };
const tdStyle: CSSProperties = { padding: '14px', borderBottom: '1px solid #F3F4F6', verticalAlign: 'top', color: '#111827' };
const secondaryLinkStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '46px', padding: '0 16px', borderRadius: '12px', border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#111827', textDecoration: 'none', fontWeight: 700 };
