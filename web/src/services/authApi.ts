import { ApiResponse, AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth';

const rawAuthUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080').trim().replace(/\/$/, '');

const getAuthBaseUrl = () => {
  if (rawAuthUrl.endsWith('/auth')) return rawAuthUrl;
  if (rawAuthUrl.endsWith('/api/v1')) return `${rawAuthUrl}/auth`;
  return `${rawAuthUrl}/api/v1/auth`;
};

const API_BASE_URL = getAuthBaseUrl();

const TOKEN_KEY = 'floodrescue_access_token';
const REFRESH_TOKEN_KEY = 'floodrescue_refresh_token';
const USER_KEY = 'floodrescue_user';

export const BACKEND_CONNECTION_ERROR_MESSAGE =
  'Không thể kết nối đến máy chủ backend. Vui lòng kiểm tra lại kết nối mạng hoặc đảm bảo backend đang hoạt động.';

export function isConnectionError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof TypeError) return true;
  const msg = String((error as any)?.message || error).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('load failed') ||
    msg.includes('fetch failed') ||
    msg.includes('network request failed') ||
    msg.includes('err_connection') ||
    msg.includes('aborterror')
  );
}

export function formatAuthErrorMessage(error: unknown, fallbackMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại.'): string {
  if (isConnectionError(error)) {
    return BACKEND_CONNECTION_ERROR_MESSAGE;
  }
  const rawMsg = (error as any)?.message;
  if (typeof rawMsg === 'string' && rawMsg.trim()) {
    const trimmed = rawMsg.trim();
    if (trimmed.toLowerCase() === 'bad credentials') {
      return 'Tài khoản hoặc mật khẩu không chính xác.';
    }
    return trimmed;
  }
  return fallbackMessage;
}

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
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...payload, platform: 'WEB' })
      });
    } catch {
      throw new Error(BACKEND_CONNECTION_ERROR_MESSAGE);
    }

    let data: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    if (!response.ok || (data && data.success === false)) {
      if (response.status >= 502 && response.status <= 504) {
        throw new Error(`Máy chủ backend tạm thời không phản hồi (Mã lỗi ${response.status}). Vui lòng thử lại sau.`);
      }
      if (response.status === 401) {
        const msg = data?.message;
        if (!msg || msg.toLowerCase() === 'bad credentials') {
          throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
        }
        throw new Error(msg);
      }
      if (response.status >= 500) {
        throw new Error(data?.message || `Máy chủ backend đang gặp sự cố (Mã lỗi ${response.status}). Vui lòng thử lại sau.`);
      }
      throw new Error(data?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
    }

    if (!data || !data.data || !data.data.user) {
      throw new Error('Phản hồi từ máy chủ không hợp lệ.');
    }

    if (!['ADMIN', 'STAFF', 'GARAGE_OWNER'].includes(data.data.user.role)) {
      authStorage.clear();
      throw new Error('Tài khoản này vui lòng đăng nhập trên Mobile');
    }
    authStorage.setToken(data.data.accessToken);
    authStorage.setRefreshToken(data.data.refreshToken);
    authStorage.setUser(data.data.user);
    return data.data;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL.replace(/\/auth$/, '')}/onboarding/garage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          account: { ...payload, application: undefined },
          application: payload.application
        })
      });
    } catch {
      throw new Error(BACKEND_CONNECTION_ERROR_MESSAGE);
    }

    let data: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    if (!response.ok || (data && data.success === false)) {
      if (response.status >= 502 && response.status <= 504) {
        throw new Error(`Máy chủ backend tạm thời không phản hồi (Mã lỗi ${response.status}). Vui lòng thử lại sau.`);
      }
      if (response.status >= 500) {
        throw new Error(data?.message || `Máy chủ backend đang gặp sự cố (Mã lỗi ${response.status}). Vui lòng thử lại sau.`);
      }
      throw new Error(data?.message || 'Đăng ký không thành công. Vui lòng thử lại.');
    }

    if (!data || !data.data || !data.data.user) {
      throw new Error('Phản hồi từ máy chủ không hợp lệ.');
    }

    if (!['ADMIN', 'STAFF', 'GARAGE_OWNER'].includes(data.data.user.role)) {
      authStorage.clear();
      throw new Error('Tài khoản này vui lòng đăng nhập trên Mobile');
    }
    authStorage.setToken(data.data.accessToken);
    authStorage.setRefreshToken(data.data.refreshToken);
    authStorage.setUser(data.data.user);
    return data.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const token = authStorage.getToken();
    if (!token) throw new Error('Chưa đăng nhập');

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch {
      throw new Error(BACKEND_CONNECTION_ERROR_MESSAGE);
    }

    let data: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    if (!response.ok || (data && data.success === false)) {
      throw new Error(data?.message || 'Không thể lấy thông tin tài khoản');
    }

    if (!data || !data.data) {
      throw new Error('Phản hồi từ máy chủ không hợp lệ.');
    }

    if (!['ADMIN', 'STAFF', 'GARAGE_OWNER'].includes(data.data.role)) {
      authStorage.clear();
      throw new Error('Tài khoản này vui lòng đăng nhập trên Mobile');
    }
    authStorage.setUser(data.data);
    return data.data;
  },

  logout: () => {
    authStorage.clear();
  }
};
