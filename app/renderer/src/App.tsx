import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './shared/components/Layout';
import { LoginPage } from './modules/auth/LoginPage';
import { AlertsPage } from './modules/alerts/AlertsPage';
import { AuditPage } from './modules/audit/AuditPage';
import { BackupPage } from './modules/backup/BackupPage';
import { CashRegisterPage } from './modules/cash/CashRegisterPage';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { InventoryBulkImportPage } from './modules/inventory/InventoryBulkImportPage';
import { InventoryPage } from './modules/inventory/InventoryPage';
import { LicensePage } from './modules/license/LicensePage';
import { PrinterSettingsPage } from './modules/printer/PrinterSettingsPage';
import { ReportsPage } from './modules/reports/ReportsPage';
import { SettingsPage } from './modules/settings/SettingsPage';
import { ProtectedRoute } from './modules/routing/ProtectedRoute';
import { POSPage } from './modules/sales/POSPage';
import { SalesHistoryPage } from './modules/sales/SalesHistoryPage';
import { PurchasePage } from './modules/purchase/PurchasePage';
import { UsersPage } from './modules/users/UsersPage';
import CustomersPage from './modules/customers/CustomersPage';
import { AuthProvider, useAuth } from './shared/context/AuthContext';
import { ConfigProvider } from './shared/context/ConfigContext';
import { es } from './shared/i18n';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('React Error:', error, errorInfo);
  }
  render() {
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
          <HashRouter>
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
          </HashRouter>
        </ConfigProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
