import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getAlertSummary, getProductAlerts } from '../../shared/api/alert.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import type { AlertSummary, ProductAlert } from '../../shared/types/alert.types';

function formatDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-CO');
}

function severityBadgeClass(severity: ProductAlert['severity']): string {
  const map = {
    RED: 'tc-badge tc-badge--danger',
    ORANGE: 'tc-badge tc-badge--warning',
    YELLOW: 'tc-badge tc-badge--neutral',
  };
  return map[severity];
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
    <div className="tc-page-container animate-fadeIn">
      {/* Page Header with Premium Styling */}
      <header className="tc-section-header animate-slideDown">
        <div>
          <p className="tc-metric-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, color: 'var(--brand-600)' }}>
            {es.alerts.title}
          </p>
          <h1 className="tc-section-title" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {es.alerts.title}
          </h1>
          <p className="tc-section-subtitle">{es.alerts.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/dashboard" className="tc-btn tc-btn--secondary">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {es.dashboard.title}
          </Link>
          <Link to="/inventory" className="tc-btn tc-btn--secondary">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {es.inventory.title}
          </Link>
        </div>
      </header>

      {loading ? (
        <section className="tc-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="24" height="24" className="animate-pulse" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
            </svg>
            <p className="tc-metric-sub">{es.common.loading}</p>
          </div>
        </section>
      ) : (
        <>
          {/* Six Metric Cards with Gradients and Animations */}
          {summary && (
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }} className="animate-slideUp">
              {/* Total Alerts - Brand */}
              <article className="tc-metric-card tc-metric-card--brand" style={{ animationDelay: '0ms' }}>
                <div className="tc-metric-icon tc-metric-icon--brand">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="tc-metric-content">
                  <p className="tc-metric-label">{es.alerts.totalAlerts}</p>
                  <p className="tc-metric-value">{summary.totalAlerts}</p>
                </div>
              </article>

              {/* Stock Critical - Danger */}
              <article className="tc-metric-card tc-metric-card--danger" style={{ animationDelay: '50ms' }}>
                <div className="tc-metric-icon tc-metric-icon--danger">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="tc-metric-content">
                  <p className="tc-metric-label">{es.alerts.stockCritical}</p>
                  <p className="tc-metric-value">{summary.stockCritical}</p>
                </div>
              </article>

              {/* Stock Low - Warning */}
              <article className="tc-metric-card tc-metric-card--warning" style={{ animationDelay: '100ms' }}>
                <div className="tc-metric-icon tc-metric-icon--warning">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="tc-metric-content">
                  <p className="tc-metric-label">{es.alerts.stockLow}</p>
                  <p className="tc-metric-value">{summary.stockLow}</p>
                </div>
              </article>

              {/* Expired - Danger */}
              <article className="tc-metric-card tc-metric-card--danger" style={{ animationDelay: '150ms' }}>
                <div className="tc-metric-icon tc-metric-icon--danger">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path d="M12 8v4m0 4h.01M4.93 4.93l14.14 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="tc-metric-content">
                  <p className="tc-metric-label">{es.alerts.expired}</p>
                  <p className="tc-metric-value">{summary.expired}</p>
                </div>
              </article>

              {/* Expiring Critical - Warning */}
              <article className="tc-metric-card tc-metric-card--warning" style={{ animationDelay: '200ms' }}>
                <div className="tc-metric-icon tc-metric-icon--warning">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="tc-metric-content">
                  <p className="tc-metric-label">{es.alerts.expiringCritical}</p>
                  <p className="tc-metric-value">{summary.expiringCritical}</p>
                </div>
              </article>

              {/* Expiring Warning - Success */}
              <article className="tc-metric-card tc-metric-card--success" style={{ animationDelay: '250ms' }}>
                <div className="tc-metric-icon tc-metric-icon--success">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 7v5l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="tc-metric-content">
                  <p className="tc-metric-label">{es.alerts.expiringWarning}</p>
                  <p className="tc-metric-value">{summary.expiringWarning}</p>
                </div>
              </article>
            </section>
          )}

          {/* Enhanced Alerts Table */}
          <section className="tc-section animate-slideUp" style={{ animationDelay: '300ms' }}>
            <div className="tc-section-header">
              <div>
                <h2 className="tc-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--brand-600)' }}>
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {es.alerts.title}
                </h2>
                <p className="tc-section-subtitle">
                  {alerts.length > 0
                    ? `${alerts.length} alerta${alerts.length !== 1 ? 's' : ''} encontrada${alerts.length !== 1 ? 's' : ''}`
                    : es.alerts.noAlerts}
                </p>
              </div>
            </div>

            {alerts.length === 0 ? (
              /* Premium Empty State */
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-12) var(--space-6)',
                textAlign: 'center',
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: 'var(--radius-2xl)',
                  background: 'var(--success-100)',
                  color: 'var(--success-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'var(--space-4)',
                }}>
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--gray-800)', marginBottom: 'var(--space-2)' }}>
                  Todo en orden
                </h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', maxWidth: '400px' }}>
                  No hay alertas activas. Todos los productos tienen stock suficiente y fechas de vencimiento vigentes.
                </p>
              </div>
            ) : (
              <div className="tc-table-wrap">
                <table className="tc-table">
                  <thead>
                    <tr>
                      <th>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                            <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {es.alerts.severity}
                        </div>
                      </th>
                      <th>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                            <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {es.alerts.type}
                        </div>
                      </th>
                      <th>{es.alerts.product}</th>
                      <th>{es.alerts.code}</th>
                      <th>{es.alerts.stock}</th>
                      <th>{es.alerts.minStock}</th>
                      <th>{es.alerts.expiryDate}</th>
                      <th>{es.alerts.daysUntil}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert, index) => (
                      <tr key={`${alert.productId}-${alert.alertType}`} style={{ animationDelay: `${index * 50}ms` }}>
                        <td>
                          <span className={severityBadgeClass(alert.severity)}>
                            {alert.severity}
                          </span>
                        </td>
                        <td>{alertTypeLabel(alert.alertType)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{alert.productName}</td>
                        <td>
                          <code style={{
                            fontSize: 'var(--text-xs)',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--gray-100)',
                            color: 'var(--gray-700)',
                            fontFamily: 'monospace',
                          }}>
                            {alert.code}
                          </code>
                        </td>
                        <td style={{ fontWeight: 600 }}>{alert.stock}</td>
                        <td>{alert.minStock}</td>
                        <td>{formatDate(alert.expiryDate)}</td>
                        <td>
                          {alert.daysUntilExpiry !== null
                            ? alert.daysUntilExpiry < 0
                              ? (
                                  <span style={{ color: 'var(--danger-600)', fontWeight: 600 }}>
                                    Vencido hace {Math.abs(alert.daysUntilExpiry)}d
                                  </span>
                                )
                              : (
                                  <span style={{
                                    color: alert.daysUntilExpiry <= 7 ? 'var(--warning-600)' : 'var(--gray-700)',
                                    fontWeight: alert.daysUntilExpiry <= 7 ? 600 : 400,
                                  }}>
                                    {alert.daysUntilExpiry}d
                                  </span>
                                )
                            : <span style={{ color: 'var(--gray-400)' }}>N/A</span>}
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
    </div>
  );
}
