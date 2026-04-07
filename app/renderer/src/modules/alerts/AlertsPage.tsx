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
    <div className="tc-page-container">
      <header className="tc-section-header">
        <div>
          <p className="tc-metric-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
            {es.alerts.title}
          </p>
          <h1 className="tc-section-title">{es.alerts.title}</h1>
          <p className="tc-section-subtitle">{es.alerts.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/dashboard" className="tc-btn tc-btn--secondary">
            {es.dashboard.title}
          </Link>
          <Link to="/inventory" className="tc-btn tc-btn--secondary">
            {es.inventory.title}
          </Link>
        </div>
      </header>

      {loading ? (
        <section className="tc-section">
          <p className="tc-metric-sub">{es.common.loading}</p>
        </section>
      ) : (
        <>
          {/* Summary cards */}
          {summary && (
            <section className="tc-grid-4">
              <article className="tc-metric-card">
                <div className="tc-metric-icon tc-metric-icon--brand">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <div className="tc-metric-content">
                  <p className="tc-metric-label">{es.alerts.totalAlerts}</p>
                  <p className="tc-metric-value">{summary.totalAlerts}</p>
                </div>
              </article>
              <article className="tc-metric-card">
                <div className="tc-metric-icon tc-metric-icon--danger">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="tc-metric-content">
                  <p className="tc-metric-label">{es.alerts.stockCritical}</p>
                  <p className="tc-metric-value">{summary.stockCritical}</p>
                </div>
              </article>
              <article className="tc-metric-card">
                <div className="tc-metric-icon tc-metric-icon--warning">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M20.62 19L12.36 4a1 1 0 00-1.72 0L2.38 19a1 1 0 00.86 1.5h15.52a1 1 0 00.86-1.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="tc-metric-content">
                  <p className="tc-metric-label">{es.alerts.stockLow}</p>
                  <p className="tc-metric-value">{summary.stockLow}</p>
                </div>
              </article>
              <article className="tc-metric-card">
                <div className="tc-metric-icon tc-metric-icon--danger">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M4.93 4.93l14.14 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <div className="tc-metric-content">
                  <p className="tc-metric-label">{es.alerts.expired}</p>
                  <p className="tc-metric-value">{summary.expired}</p>
                </div>
              </article>
              <article className="tc-metric-card">
                <div className="tc-metric-icon tc-metric-icon--warning">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <div className="tc-metric-content">
                  <p className="tc-metric-label">{es.alerts.expiringCritical}</p>
                  <p className="tc-metric-value">{summary.expiringCritical}</p>
                </div>
              </article>
              <article className="tc-metric-card">
                <div className="tc-metric-icon tc-metric-icon--success">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <div className="tc-metric-content">
                  <p className="tc-metric-label">{es.alerts.expiringWarning}</p>
                  <p className="tc-metric-value">{summary.expiringWarning}</p>
                </div>
              </article>
            </section>
          )}

          {/* Alerts table */}
          <section className="tc-section">
            <h2 className="tc-section-title">{es.alerts.title}</h2>
            {alerts.length === 0 ? (
              <p className="tc-section-subtitle">{es.alerts.noAlerts}</p>
            ) : (
              <div className="tc-table-wrap">
                <table className="tc-table">
                  <thead>
                    <tr>
                      <th>{es.alerts.severity}</th>
                      <th>{es.alerts.type}</th>
                      <th>{es.alerts.product}</th>
                      <th>{es.alerts.code}</th>
                      <th>{es.alerts.stock}</th>
                      <th>{es.alerts.minStock}</th>
                      <th>{es.alerts.expiryDate}</th>
                      <th>{es.alerts.daysUntil}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert) => (
                      <tr key={`${alert.productId}-${alert.alertType}`}>
                        <td>
                          <span className={severityBadgeClass(alert.severity)}>
                            {alert.severity}
                          </span>
                        </td>
                        <td>{alertTypeLabel(alert.alertType)}</td>
                        <td>{alert.productName}</td>
                        <td>{alert.code}</td>
                        <td>{alert.stock}</td>
                        <td>{alert.minStock}</td>
                        <td>{formatDate(alert.expiryDate)}</td>
                        <td>
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
    </div>
  );
}
