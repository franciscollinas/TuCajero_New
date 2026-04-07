import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './shared/components/Layout';
import { LoginPage } from './modules/auth/LoginPage';
import { AlertsPage } from './modules/alerts/AlertsPage';
import { AuditPage } from './modules/audit/AuditPage';
import { BackupPage } from './modules/backup/BackupPage';
import { CashRegisterPage } from './modules/cash/CashRegisterPage';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { DemoPage } from './modules/demo/DemoPage';
import { InventoryBulkImportPage } from './modules/inventory/InventoryBulkImportPage';
import { InventoryPage } from './modules/inventory/InventoryPage';
import { LicensePage } from './modules/license/LicensePage';
import { PrinterSettingsPage } from './modules/printer/PrinterSettingsPage';
import { ReportsPage } from './modules/reports/ReportsPage';
import { ProtectedRoute } from './modules/routing/ProtectedRoute';
import { POSPage } from './modules/sales/POSPage';
import { SalesHistoryPage } from './modules/sales/SalesHistoryPage';
import { UsersPage } from './modules/users/UsersPage';
import { AuthProvider, useAuth } from './shared/context/AuthContext';
import { es } from './shared/i18n';

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
  return (
    <Layout>
      {children}
    </Layout>
  );
}

export default function App(): JSX.Element {
  return (
    <AuthProvider>
      <BrowserRouter>
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
                <LayoutRoute><DashboardPage /></LayoutRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <LayoutRoute><AlertsPage /></LayoutRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cash"
            element={
              <ProtectedRoute roles={['ADMIN', 'CASHIER']}>
                <LayoutRoute><CashRegisterPage /></LayoutRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <LayoutRoute><AuditPage /></LayoutRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <LayoutRoute><InventoryPage /></LayoutRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <LayoutRoute><UsersPage /></LayoutRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/import"
            element={
              <ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}>
                <LayoutRoute><InventoryBulkImportPage /></LayoutRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}>
                <LayoutRoute><ReportsPage /></LayoutRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/backup"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <LayoutRoute><BackupPage /></LayoutRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/license"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <LayoutRoute><LicensePage /></LayoutRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/printer"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <LayoutRoute><PrinterSettingsPage /></LayoutRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute roles={['ADMIN', 'CASHIER', 'SUPERVISOR']}>
                <LayoutRoute><POSPage /></LayoutRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales/history"
            element={
              <ProtectedRoute roles={['ADMIN', 'CASHIER', 'SUPERVISOR']}>
                <LayoutRoute><SalesHistoryPage /></LayoutRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/demo"
            element={
              <ProtectedRoute>
                <LayoutRoute><DemoPage /></LayoutRoute>
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<StartRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
