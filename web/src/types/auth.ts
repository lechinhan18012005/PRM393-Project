export type Role = 'CUSTOMER' | 'GARAGE_OWNER' | 'FIELD_MECHANIC' | 'STAFF' | 'ADMIN' | 'KYC_VERIFIER' | 'SUPER_ADMIN';

export interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  fullName: string;
  avatarUrl?: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface LoginPayload {
  identifier: string; // username, email or phone
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  phone?: string;
  password: string;
  fullName: string;
  application: {
    garageName: string;
    phone?: string;
    businessLicenseUrl: string;
    idCardUrl: string;
    nd13Consent?: boolean;
    idCardStorageKey?: string;
    businessLicenseStorageKey?: string;
    firstBranchAddress?: string;
  };
}
