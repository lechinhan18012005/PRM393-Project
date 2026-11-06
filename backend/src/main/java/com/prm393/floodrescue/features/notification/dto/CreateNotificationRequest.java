package com.prm393.floodrescue.features.notification.dto;

import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.notification.entity.NotificationLevel;
import com.prm393.floodrescue.features.notification.entity.NotificationType;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateNotificationRequest {

    private Long recipientUserId;

    private Role recipientRole;

    @NotBlank(message = "Tiêu đề thông báo không được để trống")
    private String title;

    @NotBlank(message = "Nội dung thông báo không được để trống")
    private String message;

    @Builder.Default
    private NotificationType type = NotificationType.SYSTEM_BROADCAST;

    @Builder.Default
    private NotificationLevel level = NotificationLevel.INFO;

    private String targetScreen;

    private Long targetId;
}
