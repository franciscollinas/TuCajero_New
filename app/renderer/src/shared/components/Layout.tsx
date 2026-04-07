import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '../../shared/context/AuthContext';
import { useRBAC } from '../../shared/hooks/useRBAC';
import type { Permission } from '../../shared/hooks/useRBAC';
import { es } from '../../shared/i18n';

interface LayoutProps {
  children: ReactNode;
}

interface NavItemDef {
  icon: ReactNode;
  label: string;
  path: string;
  permission?: string;
}

const DASHBOARD = '/dashboard';
const ALERTS = '/alerts';
const INVENTORY = '/inventory';
const POS = '/sales';
const SALES_HISTORY = '/sales/history';
const CASH = '/cash';
const REPORTS = '/reports';
const USERS = '/users';
const AUDIT = '/audit';
const BACKUP = '/backup';
const LICENSE = '/license';
const PRINTER = '/printer';
const INVENTORY_IMPORT = '/inventory/import';

export function Layout({ children }: LayoutProps): JSX.Element {
  const { user, logout } = useAuth();
  const { can } = useRBAC();
  const location = useLocation();

  const handleLogout = async (): Promise<void> => {
    await logout();
  };

  const initials = user
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const navGroups: { label: string; items: NavItemDef[] }[] = [
    {
      label: 'Principal',
      items: [
        {
          icon: dashboardIcon,
          label: es.dashboard.title,
          path: DASHBOARD,
        },
        {
          icon: salesIcon,
          label: es.sales.posTitle,
          path: POS,
        },
        {
          icon: historyIcon,
          label: es.sales.historyTitle,
          path: SALES_HISTORY,
        },
        {
          icon: cashIcon,
          label: es.cashSession.status,
          path: CASH,
        },
      ],
    },
    {
      label: 'Gestión',
      items: [
        {
          icon: inventoryIcon,
          label: es.inventory.title,
          path: INVENTORY,
        },
        {
          icon: alertIcon,
          label: es.alerts.title,
          path: ALERTS,
        },
        {
          icon: importIcon,
          label: es.inventory.importAction,
          path: INVENTORY_IMPORT,
          permission: 'inventory:all',
        },
      ],
    },
    {
      label: 'Administración',
      items: can('audit:view')
        ? [
            { icon: reportsIcon, label: es.reports.title, path: REPORTS },
            { icon: auditIcon, label: es.audit.title, path: AUDIT },
            { icon: usersIcon, label: es.users.title, path: USERS },
            { icon: backupIcon, label: es.backup.title, path: BACKUP },
            { icon: licenseIcon, label: es.license.title, path: LICENSE },
            { icon: printerIcon, label: es.settings.printer.title, path: PRINTER },
          ]
        : [
            { icon: backupIcon, label: es.backup.title, path: BACKUP },
            { icon: licenseIcon, label: es.license.title, path: LICENSE },
            { icon: printerIcon, label: es.settings.printer.title, path: PRINTER },
          ],
    },
  ];

  return (
    <div className="tc-layout">
      {/* Sidebar */}
      <aside className="tc-sidebar">
        <div className="tc-sidebar-header">
          <div className="tc-logo">
            <span className="tc-logo-text">
              <span className="tc-logo-accent">Tu</span>Cajero
            </span>
          </div>
        </div>

        <nav className="tc-nav">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="tc-nav-group-label">{group.label}</div>
              {group.items.map((item) => {
                if (item.permission && !can(item.permission as Permission)) return null;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`tc-nav-item ${isActive ? 'tc-nav-item-active' : ''}`}
                  >
                    {item.icon}
                    <span className="tc-nav-item-text">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="tc-sidebar-user">
          <div className="tc-user-avatar">{initials}</div>
          <div className="tc-user-info">
            <div className="tc-user-name">{user?.fullName ?? ''}</div>
            <div className="tc-user-role">{user?.role === 'ADMIN' ? 'Administrador' : 'Cajero'}</div>
          </div>
          <button type="button" onClick={handleLogout} className="tc-btn tc-btn--ghost" title={es.auth.logout}>
            {logoutIcon}
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="tc-content">
        <header className="tc-header">
          <div className="tc-header-left">
            <span className="tc-header-breadcrumb">{currentBreadcrumb(location.pathname)}</span>
            <h1 className="tc-header-title">{pageTitle(location.pathname)}</h1>
          </div>
          <div className="tc-header-right">
            <span style={{ fontSize: '13px', color: '#6B7280' }}>
              {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>
        <main className="tc-main">{children}</main>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function currentBreadcrumb(path: string): string {
  const map: Record<string, string> = {
    [DASHBOARD]: 'Inicio',
    [ALERTS]: 'Gestión',
    [INVENTORY]: 'Gestión',
    [POS]: 'Ventas',
    [SALES_HISTORY]: 'Ventas',
    [CASH]: 'Caja',
    [REPORTS]: 'Administración',
    [USERS]: 'Administración',
    [AUDIT]: 'Administración',
    [BACKUP]: 'Administración',
    [LICENSE]: 'Administración',
    [PRINTER]: 'Administración',
    [INVENTORY_IMPORT]: 'Gestión',
  };
  return map[path] ?? 'TuCajero';
}

function pageTitle(path: string): string {
  const map: Record<string, string> = {
    [DASHBOARD]: es.dashboard.title,
    [ALERTS]: es.alerts.title,
    [INVENTORY]: es.inventory.title,
    [POS]: es.sales.posTitle,
    [SALES_HISTORY]: es.sales.historyTitle,
    [CASH]: es.cashSession.status,
    [REPORTS]: es.reports.title,
    [USERS]: es.users.title,
    [AUDIT]: es.audit.title,
    [BACKUP]: es.backup.title,
    [LICENSE]: es.license.title,
    [PRINTER]: es.settings.printer.title,
    [INVENTORY_IMPORT]: es.inventory.bulkImport,
  };
  return map[path] ?? es.dashboard.title;
}

/* ─── SVG Icons (inline, consistent) ─── */

const dashboardIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

const salesIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

const historyIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const cashIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="3" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

const inventoryIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const alertIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const importIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const reportsIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const auditIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const usersIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const backupIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const licenseIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const printerIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const logoutIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
