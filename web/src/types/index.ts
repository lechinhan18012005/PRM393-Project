export type ModuleType = 'admin' | 'staff' | 'owner';

export type ScreenId =
  // Module A
  | 'overview'
  | 'commission-settings'
  | 'payos-reconciliation'
  | 'payouts'
  | 'refunds'
  | 'reports'
  // Module B
  | 'dashboard'
  | 'verification'
  | 'moderation'
  | 'disputes'
  | 'monitoring'
  // Module C
  | 'owner-dashboard'
  | 'services';

export interface PayOSTransaction {
  id: string;
  orderCode: string;
  rescueCode: string;
  rescueType: string;
  customerName: string;
  customerPhone: string;
  garageName: string;
  mechanicName: string;
  totalAmount: number;
  platformFee: number;
  netPayout: number;
  checksumStatus: 'OK' | 'REV' | 'PENDING';
  status: 'RECONCILED' | 'PAID' | 'DISPUTED' | 'PENDING';
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  payosContent: string;
  timestamp: string;
  evidenceImage: string;
  evidenceLocation: string;
  rawPayload: {
    code: string;
    desc: string;
    data: {
      orderCode: number;
      amount: number;
      description: string;
      accountNumber: string;
      reference: string;
      transactionDateTime: string;
      signature: string;
    };
  };
}

export interface GarageApplicant {
  id: string;
  name: string;
  area: string;
  ownerName: string;
  phone: string;
  branchesCount: number;
  mechanicsCount: number;
  timeAgo: string;
  status: 'PENDING' | 'NEED_INFO' | 'APPROVED' | 'REJECTED';
  badge?: string;
  taxCode: string;
  idCardNumber: string;
  address: string;
  ekycMatchRate: number;
  branches: Array<{
    name: string;
    address: string;
    warning: string;
    coords: string;
    capacity: number;
    activeMechanics: number;
    mapImage: string;
  }>;
  equipment: Array<{
    name: string;
    specs: string;
    plate: string;
    statusNote: string;
    image: string;
  }>;
}

export interface FloodPoint {
  id: string;
  name: string;
  district: string;
  address: string;
  waterLevel: string;
  depthCm: number;
  level: 1 | 2 | 3;
  severity: 'RED' | 'ORANGE' | 'YELLOW';
  reportsCount: number;
  confidenceScore: number;
  coords: { lat: number; lng: number };
  photos: Array<{ url: string; time: string; caption: string }>;
  recentReports: Array<{ author: string; role: string; text: string; time: string }>;
}

export interface DisputeCase {
  id: string;
  rescueCode: string;
  payosCode: string;
  customerName: string;
  customerPhone: string;
  garageName: string;
  garageId: string;
  time: string;
  type: string;
  originalPrice: number;
  requestedRefund: number;
  inspectorNote: string;
  evidenceReceiptUrl: string;
  evidenceAppScreenUrl: string;
  audioDuration: string;
  diffItems: Array<{
    name: string;
    desc: string;
    priceV1: number | null;
    priceV2: number;
    diff: number;
    violationCode?: string;
  }>;
  status: 'STAFF_REVIEW' | 'ADMIN_APPROVAL' | 'RESOLVED';
}

export interface PayoutItem {
  id: string;
  garageName: string;
  repName: string;
  time: string;
  bankCode: string;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  requestedAmount: number;
  walletBalance: number;
  holdbackAmount: number;
  availableBalance: number;
  riskStatus: 'SAFE' | 'DISPUTED' | 'BLOCKED';
  ekycVerified: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}
