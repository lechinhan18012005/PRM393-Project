package com.prm393.floodrescue.features.notification.service.impl;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.Role;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.auth.repository.UserRepository;
import com.prm393.floodrescue.features.notification.dto.CreateNotificationRequest;
import com.prm393.floodrescue.features.notification.dto.NotificationResponse;
import com.prm393.floodrescue.features.notification.entity.Notification;
import com.prm393.floodrescue.features.notification.entity.NotificationLevel;
import com.prm393.floodrescue.features.notification.entity.NotificationType;
import com.prm393.floodrescue.features.notification.repository.NotificationRepository;
import com.prm393.floodrescue.features.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public NotificationResponse sendToUser(
            Long recipientUserId,
            String title,
            String message,
            NotificationType type,
            NotificationLevel level,
            String targetScreen,
            Long targetId
    ) {
        User recipient = userRepository.findById(recipientUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng nhận thông báo: " + recipientUserId));

        Notification notification = Notification.builder()
                .recipientUser(recipient)
                .recipientRole(recipient.getRole())
                .title(title)
                .message(message)
                .type(type)
                .level(level != null ? level : NotificationLevel.INFO)
                .targetScreen(targetScreen)
                .targetId(targetId)
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();

        Notification saved = notificationRepository.save(notification);
        NotificationResponse response = NotificationResponse.fromEntity(saved);

        broadcastWebSocket("/topic/notifications/user/" + recipientUserId, response);
        if (recipient.getRole() != null) {
            broadcastWebSocket("/topic/notifications/role/" + recipient.getRole().name(), response);
        }

        log.info("Đã tạo và gửi thông báo tới User ID: {} (Type: {}, Level: {})", recipientUserId, type, level);
        return response;
    }

    @Override
    @Transactional
    public NotificationResponse sendToRole(
            Role recipientRole,
            String title,
            String message,
            NotificationType type,
            NotificationLevel level,
            String targetScreen,
            Long targetId
    ) {
        Notification notification = Notification.builder()
                .recipientUser(null)
                .recipientRole(recipientRole)
                .title(title)
                .message(message)
                .type(type)
                .level(level != null ? level : NotificationLevel.INFO)
                .targetScreen(targetScreen)
                .targetId(targetId)
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();

        Notification saved = notificationRepository.save(notification);
        NotificationResponse response = NotificationResponse.fromEntity(saved);

        broadcastWebSocket("/topic/notifications/role/" + recipientRole.name(), response);
        broadcastWebSocket("/topic/notifications", response);

        log.info("Đã tạo và gửi thông báo tới Role: {} (Type: {}, Level: {})", recipientRole, type, level);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotifications(User user, boolean unreadOnly, int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<Notification> entityPage;
        if (unreadOnly) {
            entityPage = notificationRepository.findUnreadByRecipient(user.getId(), user.getRole(), pageable);
        } else {
            entityPage = notificationRepository.findAllByRecipient(user.getId(), user.getRole(), pageable);
        }
        return entityPage.map(NotificationResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(User user) {
        return notificationRepository.countUnreadByRecipient(user.getId(), user.getRole());
    }

    @Override
    @Transactional
    public NotificationResponse markAsRead(User user, Long notificationId) {
        Notification notification = notificationRepository.findByIdAndRecipient(notificationId, user.getId(), user.getRole())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo hoặc bạn không có quyền truy cập: " + notificationId));

        NotificationResponse response = NotificationResponse.fromEntity(notification);
        // Tự động xóa thông báo khỏi Database ngay sau khi người dùng xem
        notificationRepository.delete(notification);
        log.info("User {} đã xem thông báo {} -> Hệ thống tự động xóa khỏi Database", user.getUsername(), notificationId);
        return response;
    }

    @Override
    @Transactional
    public void deleteNotification(User user, Long notificationId) {
        Notification notification = notificationRepository.findByIdAndRecipient(notificationId, user.getId(), user.getRole())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo hoặc bạn không có quyền xóa: " + notificationId));
        notificationRepository.delete(notification);
        log.info("User {} đã xóa thủ công thông báo {}", user.getUsername(), notificationId);
    }

    @Override
    @Transactional
    public int deleteAllNotifications(User user) {
        int deleted = notificationRepository.deleteAllByRecipient(user.getId(), user.getRole());
        log.info("User {} đã xóa toàn bộ {} thông báo", user.getUsername(), deleted);
        return deleted;
    }

    @Override
    @Transactional
    public int markAllAsRead(User user) {
        // Tự động xóa toàn bộ thông báo sau khi chọn đã xem tất cả
        return deleteAllNotifications(user);
    }

    @Override
    @Transactional
    public NotificationResponse createManualNotification(User adminUser, CreateNotificationRequest request) {
        if (adminUser.getRole() != Role.ADMIN && adminUser.getRole() != Role.SUPER_ADMIN) {
            throw new BadRequestException("Chỉ Quản trị viên (Admin) mới có quyền gửi thông báo thủ công");
        }

        Notification notification = Notification.builder()
                .title(request.getTitle())
                .message(request.getMessage())
                .type(request.getType() != null ? request.getType() : NotificationType.SYSTEM_BROADCAST)
                .level(request.getLevel() != null ? request.getLevel() : NotificationLevel.INFO)
                .targetScreen(request.getTargetScreen())
                .targetId(request.getTargetId())
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();

        if (request.getRecipientUserId() != null) {
            User targetUser = userRepository.findById(request.getRecipientUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng mục tiêu: " + request.getRecipientUserId()));
            notification.setRecipientUser(targetUser);
            notification.setRecipientRole(targetUser.getRole());
        } else if (request.getRecipientRole() != null) {
            notification.setRecipientRole(request.getRecipientRole());
        }

        Notification saved = notificationRepository.save(notification);
        NotificationResponse response = NotificationResponse.fromEntity(saved);

        if (saved.getRecipientUser() != null) {
            broadcastWebSocket("/topic/notifications/user/" + saved.getRecipientUser().getId(), response);
        }
        if (saved.getRecipientRole() != null) {
            broadcastWebSocket("/topic/notifications/role/" + saved.getRecipientRole().name(), response);
        }
        broadcastWebSocket("/topic/notifications", response);

        log.info("Admin {} vừa phát đi thông báo thủ công: {}", adminUser.getUsername(), request.getTitle());
        return response;
    }

    private void broadcastWebSocket(String destination, Object payload) {
        if (messagingTemplate != null) {
            try {
                messagingTemplate.convertAndSend(destination, payload);
            } catch (Exception e) {
                log.warn("Không thể gửi thông báo WebSocket tới {}: {}", destination, e.getMessage());
            }
        }
    }
}
