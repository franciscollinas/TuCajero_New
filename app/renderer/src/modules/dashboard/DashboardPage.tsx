import { Link, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';

import { InventoryAlerts } from '../inventory/InventoryAlerts';
import { buildInventoryAlertBuckets } from '../inventory/inventory.utils';
import { useAuth } from '../../shared/context/AuthContext';
import { useRBAC } from '../../shared/hooks/useRBAC';
import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';
import { useInventoryStore } from '../../shared/store/inventory.store';

export function DashboardPage(): JSX.Element {
  const { user, logout } = useAuth();
  const { can } = useRBAC();
  const navigate = useNavigate();
  const products = useInventoryStore((state) => state.products);
  const alertBuckets = buildInventoryAlertBuckets(products);

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login');
  };

  const activeAlerts =
    alertBuckets.critical.length + alertBuckets.warning.length + (alertBuckets.expired?.length ?? 0);

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: tokens.spacing[6],
        background:
          'radial-gradient(circle at top right, rgba(37, 99, 235, 0.12), transparent 26%), linear-gradient(180deg, #F8FAFC 0%, #F3F4F6 48%, #E5E7EB 100%)',
      }}
    >
      <section
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gap: tokens.spacing[5],
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: tokens.spacing[4],
            flexWrap: 'wrap',
            padding: tokens.spacing[5],
            borderRadius: tokens.borderRadius.xl,
            background: tokens.colors.white,
            boxShadow: tokens.shadows.md,
          }}
        >
          <div>
            <p style={eyebrowStyle}>{es.app.name}</p>
            <h1 style={titleStyle}>
              {es.dashboard.welcome} · {es.dashboard.title}
            </h1>
            <p style={subtleStyle}>
              {user ? `${user.fullName} · ${user.role}` : es.common.loading}
            </p>
          </div>
          <div style={{ display: 'flex', gap: tokens.spacing[3], flexWrap: 'wrap' }}>
            <Link to="/cash" style={linkButtonStyle}>
              {es.cashSession.open}
            </Link>
            <Link to="/sales" style={linkButtonStyle}>
              {es.sales.posTitle}
            </Link>
            <Link to="/inventory" style={linkButtonStyle}>
              {es.inventory.title}
            </Link>
            <button type="button" onClick={handleLogout} style={secondaryButtonStyle}>
              {es.auth.logout}
            </button>
          </div>
        </header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: tokens.spacing[4],
          }}
        >
          {[
            { label: es.dashboard.todaySales, value: '0' },
            { label: es.dashboard.activeAlerts, value: String(activeAlerts) },
            {
              label: es.cashSession.status,
              value: user ? es.dashboard.sessionActive : es.dashboard.noSession,
            },
            { label: es.inventory.title, value: String(products.length) },
          ].map((card) => (
            <article
              key={card.label}
              style={{
                padding: tokens.spacing[5],
                borderRadius: tokens.borderRadius.xl,
                background: tokens.colors.white,
                boxShadow: tokens.shadows.sm,
                border: `1px solid ${tokens.colors.neutral[200]}`,
              }}
            >
              <p style={eyebrowStyle}>{card.label}</p>
              <p style={{ margin: 0, fontSize: tokens.typography.sizes['2xl'], fontWeight: 700 }}>
                {card.value}
              </p>
            </article>
          ))}
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.9fr)',
            gap: tokens.spacing[5],
            alignItems: 'start',
          }}
        >
          <article
            style={{
              padding: tokens.spacing[6],
              borderRadius: tokens.borderRadius.xl,
              background: tokens.colors.white,
              boxShadow: tokens.shadows.sm,
              display: 'grid',
              gap: tokens.spacing[4],
              border: `1px solid ${tokens.colors.neutral[200]}`,
            }}
          >
            <h2 style={titleStyle}>{es.dashboard.cashControl}</h2>
            <p style={subtleStyle}>{es.dashboard.fromHere}</p>
            <div style={{ display: 'flex', gap: tokens.spacing[3], flexWrap: 'wrap' }}>
              <Link to="/cash" style={linkButtonStyle}>
                {es.cashSession.open}
              </Link>
              <Link to="/inventory" style={linkButtonStyle}>
                {es.inventory.title}
              </Link>
              <Link to="/sales" style={linkButtonStyle}>
                {es.sales.posTitle}
              </Link>
              <Link to="/sales/history" style={secondaryLinkButtonStyle}>
                {es.sales.historyTitle}
              </Link>
              {can('audit:view') && (
                <Link to="/audit" style={secondaryLinkButtonStyle}>
                  {es.audit.title}
                </Link>
              )}
              {can('users:all') && (
                <Link to="/users" style={secondaryLinkButtonStyle}>
                  {es.users.title}
                </Link>
              )}
              {can('reports:all') && (
                <Link to="/reports" style={secondaryLinkButtonStyle}>
                  {es.reports.title}
                </Link>
              )}
              {can('backup:all') && (
                <Link to="/backup" style={secondaryLinkButtonStyle}>
                  {es.backup.title}
                </Link>
              )}
              {can('backup:all') && (
                <Link to="/license" style={secondaryLinkButtonStyle}>
                  {es.license.title}
                </Link>
              )}
              {can('backup:all') && (
                <Link to="/printer" style={secondaryLinkButtonStyle}>
                  {es.settings.printer.title}
                </Link>
              )}
              <Link to="/inventory/import" style={secondaryLinkButtonStyle}>
                {es.inventory.importCSV}
              </Link>
              <Link to="/alerts" style={secondaryLinkButtonStyle}>
                {es.alerts.title}
              </Link>
              <Link to="/demo" style={secondaryLinkButtonStyle}>
                {es.demo.button}
              </Link>
            </div>
          </article>

          <InventoryAlerts products={products} compact showActions={false} />
        </section>
      </section>
    </main>
  );
}

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: '#2563EB',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontSize: '12px',
  fontWeight: 700,
};

const titleStyle: CSSProperties = {
  margin: '6px 0 0',
  fontSize: '32px',
  lineHeight: 1.1,
  color: '#111827',
};

const subtleStyle: CSSProperties = {
  margin: '8px 0 0',
  color: '#6B7280',
};

const linkButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '52px',
  padding: '0 18px',
  borderRadius: '8px',
  background: '#2563EB',
  color: '#FFFFFF',
  textDecoration: 'none',
  fontWeight: 700,
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: '52px',
  padding: '0 18px',
  borderRadius: '8px',
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: '#111827',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryLinkButtonStyle: CSSProperties = {
  ...linkButtonStyle,
  background: '#FFFFFF',
  color: '#111827',
  border: '1px solid #D1D5DB',
};
