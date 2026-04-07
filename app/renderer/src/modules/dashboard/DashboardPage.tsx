import { Link } from 'react-router-dom';

import { InventoryAlerts } from '../inventory/InventoryAlerts';
import { buildInventoryAlertBuckets } from '../inventory/inventory.utils';
import { useAuth } from '../../shared/context/AuthContext';
import { useRBAC } from '../../shared/hooks/useRBAC';
import { es } from '../../shared/i18n';
import { useInventoryStore } from '../../shared/store/inventory.store';

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const { can } = useRBAC();
  const products = useInventoryStore((state) => state.products);
  const alertBuckets = buildInventoryAlertBuckets(products);

  const activeAlerts =
    alertBuckets.critical.length +
    alertBuckets.warning.length +
    (alertBuckets.expired?.length ?? 0);

  const initials = user
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <div>
      {/* Welcome banner */}
      <div className="tc-section" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #465fff, #3641f5)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#667085' }}>{es.dashboard.welcome}</p>
            <h2 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: '#101828' }}>
              {user?.fullName ?? ''}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#98a2b3' }}>
              {user ? `${user.role === 'ADMIN' ? 'Administrador' : 'Cajero'} · ${new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : es.common.loading}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/sales" className="tc-btn tc-btn--primary">
              {es.sales.posTitle}
            </Link>
            <Link to="/inventory" className="tc-btn tc-btn--secondary">
              {es.inventory.title}
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="tc-grid-4" style={{ marginBottom: '24px' }}>
        <div className="tc-metric-card">
          <div className="tc-metric-icon tc-metric-icon--brand">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /></svg>
          </div>
          <div className="tc-metric-content">
            <p className="tc-metric-label">{es.dashboard.todaySales}</p>
            <p className="tc-metric-value">$0</p>
            <p className="tc-metric-sub">0 transacciones hoy</p>
          </div>
        </div>

        <div className="tc-metric-card">
          <div className="tc-metric-icon tc-metric-icon--danger">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /></svg>
          </div>
          <div className="tc-metric-content">
            <p className="tc-metric-label">{es.dashboard.activeAlerts}</p>
            <p className="tc-metric-value">{activeAlerts}</p>
            <p className="tc-metric-sub">
              {alertBuckets.critical.length > 0 ? `${alertBuckets.critical.length} críticos` : 'Sin críticos'}
            </p>
          </div>
        </div>

        <div className="tc-metric-card">
          <div className="tc-metric-icon tc-metric-icon--success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></svg>
          </div>
          <div className="tc-metric-content">
            <p className="tc-metric-label">{es.cashSession.status}</p>
            <p className="tc-metric-value" style={{ fontSize: '20px' }}>
              {user ? es.dashboard.sessionActive : es.dashboard.noSession}
            </p>
            <p className="tc-metric-sub">{es.cashSession.isOpen}</p>
          </div>
        </div>

        <div className="tc-metric-card">
          <div className="tc-metric-icon tc-metric-icon--warning">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>
          </div>
          <div className="tc-metric-content">
            <p className="tc-metric-label">{es.inventory.title}</p>
            <p className="tc-metric-value">{products.length}</p>
            <p className="tc-metric-sub">{es.inventory.overview}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.9fr)', gap: '24px', alignItems: 'start' }}>
        <div className="tc-section">
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#101828', marginBottom: '8px' }}>
            {es.dashboard.cashControl}
          </h3>
          <p style={{ fontSize: '14px', color: '#667085', marginBottom: '20px' }}>
            {es.dashboard.fromHere}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <Link to="/cash" className="tc-btn tc-btn--primary">
              {es.cashSession.open}
            </Link>
            <Link to="/inventory" className="tc-btn tc-btn--secondary">
              {es.inventory.title}
            </Link>
            <Link to="/sales" className="tc-btn tc-btn--secondary">
              {es.sales.posTitle}
            </Link>
            <Link to="/sales/history" className="tc-btn tc-btn--secondary">
              {es.sales.historyTitle}
            </Link>
            {can('audit:view') && (
              <Link to="/audit" className="tc-btn tc-btn--secondary">
                {es.audit.title}
              </Link>
            )}
            {can('users:all') && (
              <Link to="/users" className="tc-btn tc-btn--secondary">
                {es.users.title}
              </Link>
            )}
            {can('reports:all') && (
              <Link to="/reports" className="tc-btn tc-btn--secondary">
                {es.reports.title}
              </Link>
            )}
            {can('backup:all') && (
              <Link to="/backup" className="tc-btn tc-btn--secondary">
                {es.backup.title}
              </Link>
            )}
            {can('backup:all') && (
              <Link to="/license" className="tc-btn tc-btn--secondary">
                {es.license.title}
              </Link>
            )}
            {can('backup:all') && (
              <Link to="/printer" className="tc-btn tc-btn--secondary">
                {es.settings.printer.title}
              </Link>
            )}
            <Link to="/inventory/import" className="tc-btn tc-btn--secondary">
              {es.inventory.importCSV}
            </Link>
            <Link to="/alerts" className="tc-btn tc-btn--secondary">
              {es.alerts.title}
            </Link>
            <Link to="/demo" className="tc-btn tc-btn--secondary">
              {es.demo.button}
            </Link>
          </div>
        </div>

        <InventoryAlerts products={products} compact showActions={false} />
      </div>
    </div>
  );
}
