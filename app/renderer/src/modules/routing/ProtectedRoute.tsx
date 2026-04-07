import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import type { UserRole } from '../../shared/types/auth.types';

interface ProtectedRouteProps {
  children: JSX.Element;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps): JSX.Element {
  const location = useLocation();
  const { isReady, user, isAuthorized } = useAuth();

  if (!isReady) {
    return <div style={{ padding: '24px' }}>{es.common.loading}</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !isAuthorized(roles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
