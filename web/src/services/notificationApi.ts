import { API_BASE_URL, getAuthHeaders } from './apiConfig';

export type NotificationLevel = 'CRITICAL' | 'WARNING' | 'INFO';

export type NotificationType =
  | 'SOS_NEW_ORDER'
  | 'DISPATCH_FAILED'
  | 'ORDER_ASSIGNED'
  | 'ORDER_COMPLETED'
  | 'PAYOUT_REQUEST_NEW'
  | 'PAYOUT_STATUS_CHANGED'
  | 'DISPUTE_NEW'
  | 'DISPUTE_REFUND_APPROVED'
  | 'KYC_SUBMITTED'
  | 'KYC_STATUS_CHANGED'
  | 'WALLET_BALANCE_CHANGED'
  | 'PRICE_CEILING_EXCEEDED'
  | 'PAYMENT_WEBHOOK_FRAUD'
  | 'MECHANIC_DISTANCE_WARNING'
  | 'SYSTEM_BROADCAST';

export interface NotificationItem {
  id: number;
  recipientUserId?: number | null;
  recipientRole?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  level: NotificationLevel;
  targetScreen?: string | null;
  targetId?: number | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationPageResponse {
  content: NotificationItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CreateNotificationPayload {
  recipientUserId?: number;
  recipientRole?: string;
  title: string;
  message: string;
  type?: NotificationType;
  level?: NotificationLevel;
  targetScreen?: string;
  targetId?: number;
}

export const notificationApi = {
  /**
   * Lấy danh sách thông báo phân trang của tài khoản hiện tại từ Database
   */
  getNotifications: async (
    unreadOnly = false,
    page = 0,
    size = 20
  ): Promise<NotificationItem[]> => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/notifications?unreadOnly=${unreadOnly}&page=${page}&size=${size}`,
        {
          headers: getAuthHeaders()
        }
      );
      if (!res.ok) return [];
      const json = await res.json();
      if (json.success && json.data) {
        // Hỗ trợ cả trường hợp Spring Data Page (json.data.content) lẫn Array (json.data)
        return Array.isArray(json.data.content)
          ? json.data.content
          : Array.isArray(json.data)
            ? json.data
            : [];
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Lấy số lượng thông báo chưa đọc cho badge của icon Chuông
   */
  getUnreadCount: async (): Promise<number> => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return 0;
      const json = await res.json();
      if (json.success && json.data && typeof json.data.unreadCount === 'number') {
        return json.data.unreadCount;
      }
      return 0;
    } catch {
      return 0;
    }
  },

  /**
   * Đánh dấu 1 thông báo là đã đọc trong Database
   */
  markAsRead: async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Đánh dấu toàn bộ thông báo của người dùng là đã đọc (tự động xóa trong Database)
   */
  markAllAsRead: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Xóa một thông báo cụ thể khỏi Database
   */
  deleteNotification: async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Xóa toàn bộ thông báo của tài khoản hiện tại khỏi Database
   */
  deleteAllNotifications: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/all`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Admin phát đi thông báo thủ công tới hệ thống
   */
  createNotification: async (
    payload: CreateNotificationPayload
  ): Promise<NotificationItem | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.success && json.data ? json.data : null;
    } catch {
      return null;
    }
  }
};
