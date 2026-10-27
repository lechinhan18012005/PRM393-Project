package com.prm393.floodrescue.config;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.mechanic.entity.MechanicStaff;
import com.prm393.floodrescue.features.mechanic.repository.MechanicStaffRepository;
import com.prm393.floodrescue.features.rescue.entity.RescueOrder;
import com.prm393.floodrescue.features.rescue.repository.RescueOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final RescueOrderRepository rescueOrderRepository;
    private final MechanicStaffRepository mechanicRepository;

    private static final Pattern ORDER_TRACKING_TOPIC_PATTERN = Pattern.compile("^/topic/orders/(\\d+)/tracking$");
    private static final Pattern MECHANIC_OFFER_TOPIC_PATTERN = Pattern.compile("^/topic/mechanics/(\\d+)/offers$");

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        // 1. Xác thực khi CONNECT
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                authHeader = accessor.getFirstNativeHeader("token");
                if (authHeader != null && !authHeader.startsWith("Bearer ")) {
                    authHeader = "Bearer " + authHeader;
                }
            }

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.warn("WebSocket CONNECT rejected: Missing Bearer token");
                throw new AccessDeniedException("Yêu cầu xác thực JWT hợp lệ để kết nối WebSocket!");
            }

            String token = authHeader.substring(7);
            try {
                String username = jwtService.extractUsername(token);
                if (username == null) {
                    throw new AccessDeniedException("Token không hợp lệ!");
                }
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                if (!jwtService.isTokenValid(token, userDetails) || !userDetails.isEnabled()) {
                    throw new AccessDeniedException("Token hết hạn hoặc tài khoản không hoạt động!");
                }
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                accessor.setUser(authentication);
                log.info("WebSocket STOMP connected for user: {}", username);
            } catch (Exception e) {
                log.warn("Invalid JWT in WebSocket CONNECT: {}", e.getMessage());
                throw new AccessDeniedException("Xác thực kết nối WebSocket thất bại: " + e.getMessage());
            }
        }

        // 2. Chặn SEND từ client vào các kênh broker /topic/** hoặc /queue/**
        if (StompCommand.SEND.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (destination != null && (destination.startsWith("/topic/") || destination.startsWith("/queue/"))) {
                log.warn("Unauthorized client SEND attempt to broker destination: {}", destination);
                throw new AccessDeniedException("Client không có quyền gửi trực tiếp vào broker topic/queue!");
            }
        }

        // 3. Phân quyền khi SUBSCRIBE
        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (destination == null) {
                throw new AccessDeniedException("Destination không được để trống!");
            }

            Matcher orderMatcher = ORDER_TRACKING_TOPIC_PATTERN.matcher(destination);
            if (orderMatcher.matches()) {
                Long orderId = Long.parseLong(orderMatcher.group(1));
                validateOrderSubscription(accessor, orderId);
                return message;
            }

            Matcher offerMatcher = MECHANIC_OFFER_TOPIC_PATTERN.matcher(destination);
            if (offerMatcher.matches()) {
                Long mechanicStaffId = Long.parseLong(offerMatcher.group(1));
                validateMechanicOfferSubscription(accessor, mechanicStaffId);
                return message;
            }

            log.warn("Subscription to disallowed destination: {}", destination);
            throw new AccessDeniedException("Destination không được phép đăng ký: " + destination);
        }

        return message;
    }

    private void validateOrderSubscription(StompHeaderAccessor accessor, Long orderId) {
        if (accessor.getUser() == null) {
            log.warn("Anonymous user attempted to subscribe to order: {}", orderId);
            throw new AccessDeniedException("Yêu cầu đăng nhập để theo dõi đơn!");
        }

        Object principal = ((UsernamePasswordAuthenticationToken) accessor.getUser()).getPrincipal();
        if (principal instanceof User user) {
            if (user.getRole() == com.prm393.floodrescue.features.auth.entity.Role.ADMIN
                    || user.getRole() == com.prm393.floodrescue.features.auth.entity.Role.STAFF) {
                return;
            }

            if (!rescueOrderRepository.existsById(orderId)) {
                throw new AccessDeniedException("Đơn không tồn tại!");
            }

            // Kiểm tra trạng thái đơn còn hoạt động cho tracking không
            if (!rescueOrderRepository.isOrderActiveForTracking(orderId)) {
                log.warn("User {} attempted to subscribe to ended/inactive order {}", user.getUsername(), orderId);
                throw new AccessDeniedException("Đơn cứu hộ đã kết thúc hành trình, không còn phát dữ liệu tracking trực tiếp!");
            }

            // Truy vấn trực tiếp boolean không phụ thuộc lazy loading ngoài transaction
            boolean canSubscribe = rescueOrderRepository.canUserSubscribeToOrder(orderId, user.getId());
            if (!canSubscribe) {
                log.warn("User {} denied subscription to order {}", user.getUsername(), orderId);
                throw new AccessDeniedException("Bạn không có quyền theo dõi đơn cứu hộ này!");
            }
        }
    }

    private void validateMechanicOfferSubscription(StompHeaderAccessor accessor, Long mechanicStaffId) {
        if (accessor.getUser() == null) {
            log.warn("Anonymous user attempted to subscribe to mechanic offers: {}", mechanicStaffId);
            throw new AccessDeniedException("Yêu cầu đăng nhập để nhận offer điều phối!");
        }

        Object principal = ((UsernamePasswordAuthenticationToken) accessor.getUser()).getPrincipal();
        if (principal instanceof User user) {
            if (user.getRole() == com.prm393.floodrescue.features.auth.entity.Role.ADMIN
                    || user.getRole() == com.prm393.floodrescue.features.auth.entity.Role.STAFF) {
                return;
            }

            if (user.getRole() == com.prm393.floodrescue.features.auth.entity.Role.FIELD_MECHANIC) {
                MechanicStaff staff = mechanicRepository.findByUserId(user.getId()).orElse(null);
                if (staff != null && staff.getId().equals(mechanicStaffId)) {
                    return;
                }
            }

            log.warn("User {} denied subscription to mechanic {} offers", user.getUsername(), mechanicStaffId);
            throw new AccessDeniedException("Bạn không có quyền nhận offer của thợ khác!");
        }
    }
}
