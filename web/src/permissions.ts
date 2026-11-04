import { ModuleType, ScreenId } from './types';
import { Role } from './types/auth';

export const screenModule: Record<ScreenId, ModuleType> = {
  'staff-accounts': 'admin',
  'garage-team': 'owner',
  'garage-finance': 'owner',
  'garage-transport': 'owner',
  overview: 'admin',
  'commission-settings': 'admin',
  'payos-reconciliation': 'admin',
  payouts: 'admin',
  refunds: 'admin',
  reports: 'admin',
  dashboard: 'staff',
  verification: 'staff',
  moderation: 'staff',
  disputes: 'staff',
  monitoring: 'staff',
  'owner-dashboard': 'owner',
  services: 'owner'
};

export const roleModules: Record<Role, ModuleType[]> = {
  ADMIN: ['admin', 'staff'],
  SUPER_ADMIN: ['admin', 'staff'],
  KYC_VERIFIER: ['admin', 'staff'],
  STAFF: ['staff'],
  GARAGE_OWNER: ['owner'],
  FIELD_MECHANIC: [],
  CUSTOMER: []
};

export const canAccessModule = (role: Role, module: ModuleType) => roleModules[role]?.includes(module) ?? false;
export const canAccessScreen = (role: Role, screen: ScreenId) => canAccessModule(role, screenModule[screen]);
