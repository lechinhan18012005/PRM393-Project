import { ApiResponse, AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth';

const rawAuthUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080')
  .trim()
  .replace(/\/$/, '');

const getAuthBaseUrl = () => {
  if (rawAuthUrl.endsWith('/auth')) return rawAuthUrl;
  if (rawAuthUrl.endsWith('/api/v1')) return `${rawAuthUrl}/auth`;
  return `${rawAuthUrl}/api/v1/auth`;
};

const API_BASE_URL = getAuthBaseUrl();

const TOKEN_KEY = 'floodrescue_access_token';
const REFRESH_TOKEN_KEY = 'floodrescue_refresh_token';
const USER_KEY = 'floodrescue_user';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) => localStorage.setItem(REFRESH_TOKEN_KEY, token),
  getUser: (): User | null => {
    const data = localStorage.getItem(USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as User;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  },
  setUser: (user: User) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data: ApiResponse<AuthResponse> = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Đăng nhập không thành công');
    }

    authStorage.setToken(data.data.accessToken);
    authStorage.setRefreshToken(data.data.refreshToken);
    authStorage.setUser(data.data.user);
    return data.data;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data: ApiResponse<AuthResponse> = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Đăng ký không thành công');
    }

    authStorage.setToken(data.data.accessToken);
    authStorage.setRefreshToken(data.data.refreshToken);
    authStorage.setUser(data.data.user);
    return data.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const token = authStorage.getToken();
    if (!token) throw new Error('Chưa đăng nhập');

    const response = await fetch(`${API_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data: ApiResponse<User> = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Không thể lấy thông tin tài khoản');
    }

    authStorage.setUser(data.data);
    return data.data;
  },

  logout: () => {
    authStorage.clear();
  }
};
