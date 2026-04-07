import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { authStorageKey } from '../store/auth.store';
import { login, logout, validateSession } from '../api/auth.api';
import type { AuthUser, UserRole } from '../types/auth.types';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isReady: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthorized: (requiredRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStoredToken(): string | null {
  return localStorage.getItem(authStorageKey);
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [isReady, setIsReady] = useState(false);

  useEffect((): (() => void) => {
    let cancelled = false;

    const restoreSession = async (): Promise<void> => {
      if (!token) {
        setIsReady(true);
        return;
      }

      try {
        const response = await validateSession(token);

        if (cancelled) {
          return;
        }

        if (response.success) {
          setUser(response.data);
        } else {
          localStorage.removeItem(authStorageKey);
          setToken(null);
          setUser(null);
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem(authStorageKey);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleLogin = async (username: string, password: string): Promise<void> => {
    try {
      const response = await login(username, password);

      if (!response.success) {
        throw new Error(response.error.message);
      }

      localStorage.setItem(authStorageKey, response.data.token);
      setToken(response.data.token);
      setUser(response.data.user);
    } catch (err) {
      throw err instanceof Error ? err : new Error('No se pudo iniciar sesión.');
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      if (token) {
        await logout(token);
      }
    } finally {
      localStorage.removeItem(authStorageKey);
      setToken(null);
      setUser(null);
    }
  };

  const isAuthorized = (requiredRoles: UserRole[]): boolean => {
    if (!user) {
      return false;
    }

    return requiredRoles.some((role) => role.toLowerCase() === user.role.toLowerCase());
  };

  return (
    <AuthContext.Provider value={{ user, token, isReady, login: handleLogin, logout: handleLogout, isAuthorized }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
