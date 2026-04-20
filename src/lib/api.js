import axios from 'axios';
import { API_BASE_URL, TOKEN_STORAGE_KEY } from './config.js';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export const extractErrorMessage = (error, fallback = 'Something went wrong') => {
  const data = error?.response?.data;
  if (typeof data === 'string') return data;
  return (
    data?.message ||
    data?.error ||
    error?.message ||
    fallback
  );
};
