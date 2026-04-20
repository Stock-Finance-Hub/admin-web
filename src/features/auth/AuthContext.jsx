import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from './auth.api.js';
import { setUnauthorizedHandler } from '../../lib/api.js';
import {
  ADMIN_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
} from '../../lib/config.js';

const AuthContext = createContext(null);

const readStoredAdmin = () => {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(readStoredAdmin);
  const [token, setToken] = useState(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY),
  );
  const [bootstrapping, setBootstrapping] = useState(Boolean(token));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    setToken(null);
    setAdmin(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => logout());
  }, [logout]);

  useEffect(() => {
    if (!token) {
      setBootstrapping(false);
      return;
    }
    let cancelled = false;
    authApi
      .me()
      .then(({ admin: fresh }) => {
        if (cancelled) return;
        setAdmin(fresh);
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(fresh));
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
    // Run once on mount with the token we have.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { accessToken, admin: next } = await authApi.login({ email, password });
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(next));
    setToken(accessToken);
    setAdmin(next);
    return next;
  }, []);

  const value = useMemo(
    () => ({
      admin,
      token,
      isAuthenticated: Boolean(token && admin),
      bootstrapping,
      login,
      logout,
    }),
    [admin, token, bootstrapping, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
