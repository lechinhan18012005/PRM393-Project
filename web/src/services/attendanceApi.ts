import { request } from './managementApi';

export interface MechanicStatusLogDto {
  id: number;
  mechanicStaffId: number;
  mechanicFullName?: string;
  branchId?: number;
  branchName?: string;
  eventType: string; // ONLINE, PAUSE, RESUME, OFFLINE, AUTO_REAPED, BUSY_START, BUSY_END
  statusFrom?: string;
  statusTo: string;
  pauseReason?: string;
  isManualOverride: boolean;
  isOvertime: boolean;
  latitude?: number;
  longitude?: number;
  deviceBatteryPct?: number;
  createdAt: string;
}

export interface MechanicAttendanceItem {
  mechanicStaffId: number;
  mechanicFullName: string;
  phone?: string;
  branchId?: number;
  branchName?: string;
  shiftName?: string;
  currentStatus: string;
  isPaused: boolean;
  currentPauseReason?: string;
  firstOnlineAt?: string | null;
  lastOfflineAt?: string | null;
  totalOnlineMinutes: number;
  totalBreakMinutes: number;
  totalOvertimeMinutes: number;
  completedOrdersCount: number;
  timelineLogs: MechanicStatusLogDto[];
}

export interface MechanicAttendanceSummary {
  reportDate: string;
  garageId: number;
  garageName: string;
  totalMechanicsCount: number;
  activeTodayCount: number;
  totalOnlineHours: number;
  totalOvertimeHours: number;
  totalCompletedOrders: number;
  items: MechanicAttendanceItem[];
}

export interface RescueOrderAuditLogDto {
  id: number;
  orderId: number;
  orderCode: string;
  mechanicStaffId?: number;
  mechanicFullName?: string;
  action: string;
  statusFrom?: string;
  statusTo: string;
  actorId?: number;
  actorName?: string;
  actorRole: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  evidencePhotoUrl?: string;
  createdAt: string;
}

export const attendanceApi = {
  getSummary: (date?: string, branchId?: number, staffId?: number) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (branchId) params.append('branchId', branchId.toString());
    if (staffId) params.append('staffId', staffId.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<MechanicAttendanceSummary>(`/garages/attendance${query}`);
  },

  getTimeCard: (staffId: number, date?: string) => {
    const query = date ? `?date=${date}` : '';
    return request<MechanicAttendanceItem>(`/garages/attendance/mechanics/${staffId}${query}`);
  },

  downloadCsv: async (date?: string, branchId?: number) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (branchId) params.append('branchId', branchId.toString());
    const query = params.toString() ? `?${params.toString()}` : '';

    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
    const response = await fetch(`${baseUrl}/garages/attendance/export${query}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error('Không thể tải file báo cáo chấm công');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cham-cong-tho-${date || new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  getOrderAuditLogs: (orderId: number) => {
    return request<RescueOrderAuditLogDto[]>(`/garages/orders/${orderId}/audit-logs`);
  }
};
