import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../shared/context/AuthContext';
import { useLicense } from '../../shared/context/LicenseContext';
import { es } from '../../shared/i18n';
import type { UserRole } from '../../shared/types/auth.types';

interface ProtectedRouteProps {
  children: JSX.Element;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps): JSX.Element {
  const location = useLocation();
  const { isReady: authReady, user, isAuthorized } = useAuth();
  const { isBlocked, isLoading: licenseLoading } = useLicense();

  if (!authReady || licenseLoading) {
    return <div style={{ padding: '24px' }}>{es.common.loading}</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Si el sistema está bloqueado y no estamos en la página de licencia, redirigir
  if (isBlocked && location.pathname !== '/license') {
    return <Navigate to="/license" replace />;
  }

  if (roles && !isAuthorized(roles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
