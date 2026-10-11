import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role, LoginPayload, RegisterPayload } from '../types/auth';
import { authApi, authStorage } from '../services/authApi';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  demoLogin: (role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const DEMO_CREDENTIALS: Record<Role, LoginPayload> = {
  ADMIN: { identifier: 'admin@floodrescue.vn', password: 'Password@123' },
  STAFF: { identifier: 'staff@floodrescue.vn', password: 'Password@123' },
  GARAGE_OWNER: { identifier: 'garage@floodrescue.vn', password: 'Password@123' },
  FIELD_MECHANIC: { identifier: 'mechanic@floodrescue.vn', password: 'Password@123' },
  CUSTOMER: { identifier: 'customer@floodrescue.vn', password: 'Password@123' }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = authStorage.getToken();
      const storedUser = authStorage.getUser();

      if (storedToken && storedUser && !storedToken.startsWith('mock-jwt-token-')) {
        try {
          const currentUser = await authApi.getCurrentUser();
          setToken(storedToken);
          setUser(currentUser);
        } catch {
          authStorage.clear();
        }
      } else if (storedToken || storedUser) {
        authStorage.clear();
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const data = await authApi.login(payload);
      setToken(data.accessToken);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      const data = await authApi.register(payload);
      setToken(data.accessToken);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async (role: Role) => {
    if (!DEMO_MODE) throw new Error('Tài khoản mẫu chỉ dùng trong chế độ demo');
    const creds = DEMO_CREDENTIALS[role];
    await login(creds);
  };

  const logout = () => {
    authApi.logout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        demoLogin,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
