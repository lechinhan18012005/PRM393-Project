import { Client } from '@stomp/stompjs';
import { NotificationItem } from './notificationApi';
import { authStorage } from './authApi';

let stompClient: Client | null = null;

const getWebSocketUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080')
    .trim()
    .replace(/\/$/, '')
    .replace(/\/api\/v1\/?$/, '');

  const wsBase = envUrl.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
  return `${wsBase}/ws-rescue`;
};

export const connectNotificationSocket = (
  userId: number,
  role: string,
  onNotificationReceived: (notification: NotificationItem) => void
): (() => void) => {
  if (stompClient && stompClient.active) {
    stompClient.deactivate();
  }

  const token = authStorage.getToken();
  if (!token) {
    return () => {};
  }

  const client = new Client({
    brokerURL: getWebSocketUrl(),
    connectHeaders: {
      Authorization: `Bearer ${token}`
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {
      // Bật debug nếu cần theo dõi
    }
  });

  client.onConnect = () => {
    // 1. Lắng nghe thông báo riêng của User (chỉ khi có userId hợp lệ)
    if (userId && userId > 0) {
      client.subscribe(`/topic/notifications/user/${userId}`, (message) => {
        try {
          const item: NotificationItem = JSON.parse(message.body);
          onNotificationReceived(item);
        } catch (err) {
          console.warn('Lỗi phân tích gói tin WebSocket User:', err);
        }
      });
    }

    // 2. Lắng nghe thông báo theo vai trò (Role: ADMIN, STAFF, GARAGE_OWNER)
    if (role) {
      client.subscribe(`/topic/notifications/role/${role}`, (message) => {
        try {
          const item: NotificationItem = JSON.parse(message.body);
          onNotificationReceived(item);
        } catch (err) {
          console.warn('Lỗi phân tích gói tin WebSocket Role:', err);
        }
      });
    }

    // 3. Lắng nghe thông báo chung toàn hệ thống
    client.subscribe('/topic/notifications', (message) => {
      try {
        const item: NotificationItem = JSON.parse(message.body);
        onNotificationReceived(item);
      } catch (err) {
        console.warn('Lỗi phân tích gói tin WebSocket General:', err);
      }
    });
  };

  client.onStompError = (frame) => {
    console.warn('WebSocket STOMP Broker Error:', frame.headers['message']);
  };

  client.activate();
  stompClient = client;

  return () => {
    if (client.active) {
      client.deactivate();
    }
  };
};

export const disconnectNotificationSocket = () => {
  if (stompClient && stompClient.active) {
    stompClient.deactivate();
    stompClient = null;
  }
};
