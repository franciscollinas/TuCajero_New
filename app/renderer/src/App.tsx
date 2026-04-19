import React, { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './shared/components/Layout';
const LoginPage = lazy(() =>
  import('./modules/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const AlertsPage = lazy(() =>
  import('./modules/alerts/AlertsPage').then((m) => ({ default: m.AlertsPage })),
);
const AuditPage = lazy(() =>
  import('./modules/audit/AuditPage').then((m) => ({ default: m.AuditPage })),
);
const BackupPage = lazy(() =>
  import('./modules/backup/BackupPage').then((m) => ({ default: m.BackupPage })),
);
const CashRegisterPage = lazy(() =>
  import('./modules/cash/CashRegisterPage').then((m) => ({ default: m.CashRegisterPage })),
);
const DashboardPage = lazy(() =>
  import('./modules/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const InventoryBulkImportPage = lazy(() =>
  import('./modules/inventory/InventoryBulkImportPage').then((m) => ({
    default: m.InventoryBulkImportPage,
  })),
);
const InventoryPage = lazy(() =>
  import('./modules/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })),
);
const LicensePage = lazy(() =>
  import('./modules/license/LicensePage').then((m) => ({ default: m.LicensePage })),
);
const PrinterSettingsPage = lazy(() =>
  import('./modules/printer/PrinterSettingsPage').then((m) => ({ default: m.PrinterSettingsPage })),
);
const ReportsPage = lazy(() =>
  import('./modules/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const SettingsPage = lazy(() =>
  import('./modules/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
import { ProtectedRoute } from './modules/routing/ProtectedRoute';
const POSPage = lazy(() => import('./modules/sales/POSPage').then((m) => ({ default: m.POSPage })));
const SalesHistoryPage = lazy(() =>
  import('./modules/sales/SalesHistoryPage').then((m) => ({ default: m.SalesHistoryPage })),
);
const PurchasePage = lazy(() =>
  import('./modules/purchase/PurchasePage').then((m) => ({ default: m.PurchasePage })),
);
const UsersPage = lazy(() =>
  import('./modules/users/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const CustomersPage = lazy(() => import('./modules/customers/CustomersPage'));
import { AuthProvider, useAuth } from './shared/context/AuthContext';
import { ConfigProvider } from './shared/context/ConfigContext';
import { LicenseProvider } from './shared/context/LicenseContext';
import { es } from './shared/i18n';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('React Error:', error, errorInfo);
  }
  render(): React.ReactNode {
    if (this.state.hasError)
      return (
        <div style={{ padding: 20, color: 'red' }}>
          <h1>Browser Error</h1>
          <p>Check console for details.</p>
        </div>
      );
    return this.props.children;
  }
}

function StartRoute(): JSX.Element {
  const { isReady, user } = useAuth();

  if (!isReady) {
    return <div style={{ padding: '24px' }}>{es.common.loading}</div>;
  }

  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

function PublicRoute({ children }: { children: JSX.Element }): JSX.Element {
  const { isReady, user } = useAuth();

  if (!isReady) {
    return <div style={{ padding: '24px' }}>{es.common.loading}</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/** Envuelve cualquier página dentro del Layout con sidebar */
function LayoutRoute({ children }: { children: JSX.Element }): JSX.Element {
  return <Layout>{children}</Layout>;
}

export default function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ConfigProvider>
          <LicenseProvider>
            <HashRouter>
              <Suspense
                fallback={
                  <div
                    style={{
                      height: '100vh',
                      width: '100vw',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: '20px',
                      background: '#f1f5f9',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid #e2e8f0',
                        borderTop: '3px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    <style>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}</style>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                      {es.common.loading}...
                    </span>
                  </div>
                }
              >
                <Routes>
                  <Route
                    path="/login"
                    element={
                      <PublicRoute>
                        <LoginPage />
                      </PublicRoute>
                    }
                  />

                  {/* Rutas con Sidebar Layout */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <LayoutRoute>
                          <DashboardPage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/alerts"
                    element={
                      <ProtectedRoute>
                        <LayoutRoute>
                          <AlertsPage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/cash"
                    element={
                      <ProtectedRoute roles={['ADMIN', 'CASHIER']}>
                        <LayoutRoute>
                          <CashRegisterPage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/audit"
                    element={
                      <ProtectedRoute roles={['ADMIN']}>
                        <LayoutRoute>
                          <AuditPage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/inventory"
                    element={
                      <ProtectedRoute>
                        <LayoutRoute>
                          <InventoryPage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/users"
                    element={
                      <ProtectedRoute roles={['ADMIN']}>
                        <LayoutRoute>
                          <UsersPage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/inventory/import"
                    element={
                      <ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}>
                        <LayoutRoute>
                          <InventoryBulkImportPage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}>
                        <LayoutRoute>
                          <ReportsPage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/backup"
                    element={
                      <ProtectedRoute roles={['ADMIN']}>
                        <LayoutRoute>
                          <BackupPage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/license"
                    element={
                      <ProtectedRoute roles={['ADMIN']}>
                        <LayoutRoute>
                          <LicensePage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/printer"
                    element={
                      <ProtectedRoute roles={['ADMIN']}>
                        <LayoutRoute>
                          <PrinterSettingsPage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute roles={['ADMIN']}>
                        <LayoutRoute>
                          <SettingsPage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/purchase"
                    element={
                      <ProtectedRoute roles={['ADMIN']}>
                        <LayoutRoute>
                          <PurchasePage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/sales"
                    element={
                      <ProtectedRoute roles={['ADMIN', 'CASHIER', 'SUPERVISOR']}>
                        <LayoutRoute>
                          <POSPage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/sales/history"
                    element={
                      <ProtectedRoute roles={['ADMIN', 'CASHIER', 'SUPERVISOR']}>
                        <LayoutRoute>
                          <SalesHistoryPage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/customers"
                    element={
                      <ProtectedRoute roles={['ADMIN', 'CASHIER', 'SUPERVISOR']}>
                        <LayoutRoute>
                          <CustomersPage />
                        </LayoutRoute>
                      </ProtectedRoute>
                    }
                  />

                  <Route path="/" element={<StartRoute />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </HashRouter>
          </LicenseProvider>
        </ConfigProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
