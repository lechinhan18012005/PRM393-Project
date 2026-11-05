package com.prm393.floodrescue.features.notification.service;

import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.notification.dto.CreateNotificationRequest;
import com.prm393.floodrescue.features.notification.dto.NotificationResponse;
import com.prm393.floodrescue.features.notification.entity.NotificationLevel;
import com.prm393.floodrescue.features.notification.entity.NotificationType;
import org.springframework.data.domain.Page;

public interface NotificationService {

    NotificationResponse sendToUser(
            Long recipientUserId,
            String title,
            String message,
            NotificationType type,
            NotificationLevel level,
            String targetScreen,
            Long targetId
    );

    NotificationResponse sendToRole(
            Role recipientRole,
            String title,
            String message,
            NotificationType type,
            NotificationLevel level,
            String targetScreen,
            Long targetId
    );

    Page<NotificationResponse> getNotifications(User user, boolean unreadOnly, int page, int size);

    long getUnreadCount(User user);

    NotificationResponse markAsRead(User user, Long notificationId);

    int markAllAsRead(User user);

    void deleteNotification(User user, Long notificationId);

    int deleteAllNotifications(User user);

    NotificationResponse createManualNotification(User adminUser, CreateNotificationRequest request);
}
