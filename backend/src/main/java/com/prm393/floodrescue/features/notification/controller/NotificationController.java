package com.prm393.floodrescue.features.notification.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.notification.dto.CreateNotificationRequest;
import com.prm393.floodrescue.features.notification.dto.NotificationResponse;
import com.prm393.floodrescue.features.notification.dto.UnreadCountResponse;
import com.prm393.floodrescue.features.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notification", description = "Quản lý Thông Báo & Cảnh Báo Hệ Thống (Gara, Staff, Admin, Customer)")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Lấy danh sách thông báo của tài khoản hiện tại")
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getNotifications(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<NotificationResponse> result = notificationService.getNotifications(user, unreadOnly, page, size);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thông báo thành công", result));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Lấy số lượng thông báo chưa đọc (cho icon chuông)")
    public ResponseEntity<ApiResponse<UnreadCountResponse>> getUnreadCount(
            @AuthenticationPrincipal User user
    ) {
        long count = notificationService.getUnreadCount(user);
        return ResponseEntity.ok(ApiResponse.success("Lấy số lượng thông báo chưa đọc thành công", new UnreadCountResponse(count)));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Đánh dấu một thông báo là đã đọc")
    public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        NotificationResponse response = notificationService.markAsRead(user, id);
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu thông báo là đã đọc", response));
    }

    @PostMapping("/read-all")
    @Operation(summary = "Đánh dấu tất cả thông báo của người dùng là đã đọc (tự động dọn dẹp)")
    public ResponseEntity<ApiResponse<Integer>> markAllAsRead(
            @AuthenticationPrincipal User user
    ) {
        int updatedCount = notificationService.markAllAsRead(user);
        return ResponseEntity.ok(ApiResponse.success("Đã xem và tự động xóa " + updatedCount + " thông báo", updatedCount));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa thủ công một thông báo")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @AuthenticationPrincipal User user,
            @PathVariable Long id
    ) {
        notificationService.deleteNotification(user, id);
        return ResponseEntity.ok(ApiResponse.success("Xóa thông báo thành công", null));
    }

    @DeleteMapping("/all")
    @Operation(summary = "Xóa toàn bộ thông báo của người dùng hiện tại")
    public ResponseEntity<ApiResponse<Integer>> deleteAllNotifications(
            @AuthenticationPrincipal User user
    ) {
        int count = notificationService.deleteAllNotifications(user);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa toàn bộ " + count + " thông báo", count));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Admin phát đi thông báo thủ công tới người dùng hoặc phân hệ cụ thể")
    public ResponseEntity<ApiResponse<NotificationResponse>> createManualNotification(
            @AuthenticationPrincipal User adminUser,
            @Valid @RequestBody CreateNotificationRequest request
    ) {
        NotificationResponse response = notificationService.createManualNotification(adminUser, request);
        return ResponseEntity.ok(ApiResponse.success("Phát đi thông báo thành công", response));
    }
}
