import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authApi } from "./auth.api.js";
import { setUnauthorizedHandler } from "../../lib/api.js";
import { ADMIN_STORAGE_KEY, TOKEN_STORAGE_KEY } from "../../lib/config.js";

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
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 401) {
          logout();
        }
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const requestOtp = useCallback(({ email, password }) => {
    return authApi.login({ email, password });
  }, []);

  const verifyOtp = useCallback(async ({ email, code }) => {
    const { accessToken, admin: next } = await authApi.verifyOtp({
      email,
      code,
    });
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(next));
    setToken(accessToken);
    setAdmin(next);
    return next;
  }, []);

  const resendOtp = useCallback(({ email }) => {
    return authApi.resendOtp({ email });
  }, []);

  const value = useMemo(
    () => ({
      admin,
      token,
      isAuthenticated: Boolean(token && admin),
      bootstrapping,
      requestOtp,
      verifyOtp,
      resendOtp,
      logout,
    }),
    [admin, token, bootstrapping, requestOtp, verifyOtp, resendOtp, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
