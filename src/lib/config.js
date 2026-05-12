const inferDevApi = () => {
  if (typeof window === 'undefined') return null;
  if (!import.meta.env.DEV) return null;
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;
  return `http://${hostname}:4500/api/v1`;
};

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? inferDevApi() ?? 'http://localhost:4500/api/v1';

export const TOKEN_STORAGE_KEY = 'sfh_admin_token';
export const ADMIN_STORAGE_KEY = 'sfh_admin_user';
