import { authStorage } from './authApi';

const rawUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080')
  .trim()
  .replace(/\/$/, '')
  .replace(/\/auth\/?$/, '');

export const API_BASE_URL = rawUrl.endsWith('/api/v1') ? rawUrl : `${rawUrl}/api/v1`;

export const getAuthHeaders = (): HeadersInit => {
  const token = authStorage.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};
