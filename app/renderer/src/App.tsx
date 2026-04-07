import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

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
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cash"
            element={
              <ProtectedRoute roles={['ADMIN', 'CASHIER']}>
                <CashRegisterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AuditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/import"
            element={
              <ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}>
                <InventoryBulkImportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={['ADMIN', 'SUPERVISOR']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/backup"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <BackupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/license"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <LicensePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/printer"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <PrinterSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute roles={['ADMIN', 'CASHIER', 'SUPERVISOR']}>
                <POSPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales/history"
            element={
              <ProtectedRoute roles={['ADMIN', 'CASHIER', 'SUPERVISOR']}>
                <SalesHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/demo"
            element={
              <ProtectedRoute>
                <DemoPage />
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
