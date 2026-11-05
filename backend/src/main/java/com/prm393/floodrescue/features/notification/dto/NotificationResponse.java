package com.prm393.floodrescue.features.notification.dto;

import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.notification.entity.Notification;
import com.prm393.floodrescue.features.notification.entity.NotificationLevel;
import com.prm393.floodrescue.features.notification.entity.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {

    private Long id;
    private Long recipientUserId;
    private Role recipientRole;
    private String title;
    private String message;
    private NotificationType type;
    private NotificationLevel level;
    private String targetScreen;
    private Long targetId;
    private boolean isRead;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;

    public static NotificationResponse fromEntity(Notification entity) {
        if (entity == null) return null;
        return NotificationResponse.builder()
                .id(entity.getId())
                .recipientUserId(entity.getRecipientUser() != null ? entity.getRecipientUser().getId() : null)
                .recipientRole(entity.getRecipientRole())
                .title(entity.getTitle())
                .message(entity.getMessage())
                .type(entity.getType())
                .level(entity.getLevel())
                .targetScreen(entity.getTargetScreen())
                .targetId(entity.getTargetId())
                .isRead(entity.isRead())
                .readAt(entity.getReadAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
