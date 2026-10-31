package com.prm393.floodrescue.features.rating.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.rating.dto.CreateRatingRequest;
import com.prm393.floodrescue.features.rating.dto.RatingResponse;
import com.prm393.floodrescue.features.rating.service.ServiceRatingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/ratings")
@RequiredArgsConstructor
@Tag(name = "Service Ratings (UC-19)", description = "API đánh giá và nhận xét chất lượng dịch vụ sau cứu hộ")
public class ServiceRatingController {

    private final ServiceRatingService serviceRatingService;

    @Operation(
            summary = "[Customer] Gửi đánh giá sau dịch vụ (UC-19)",
            description = "Khách hàng chấm điểm 1-5 sao, chọn thẻ đánh giá nhanh và viết nhận xét cho đơn cứu hộ đã hoàn tất"
    )
    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<RatingResponse>> createRating(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateRatingRequest request
    ) {
        RatingResponse response = serviceRatingService.createRating(currentUser, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Cảm ơn bạn đã gửi đánh giá chất lượng dịch vụ", response));
    }

    @Operation(
            summary = "[Customer] Xem danh sách đánh giá đã gửi của tôi",
            description = "Lấy lịch sử đánh giá dịch vụ của khách hàng đang đăng nhập"
    )
    @GetMapping("/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<RatingResponse>>> getMyRatings(
            @AuthenticationPrincipal User currentUser
    ) {
        List<RatingResponse> list = serviceRatingService.getMyRatings(currentUser);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử đánh giá của bạn thành công", list));
    }

    @Operation(
            summary = "Xem đánh giá của một đơn cứu hộ",
            description = "Tra cứu đánh giá theo mã đơn cứu hộ (rescueOrderId)"
    )
    @GetMapping("/order/{rescueOrderId}")
    public ResponseEntity<ApiResponse<RatingResponse>> getRatingByOrder(
            @PathVariable("rescueOrderId") Long rescueOrderId
    ) {
        RatingResponse rating = serviceRatingService.getRatingByOrder(rescueOrderId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin đánh giá của đơn cứu hộ thành công", rating));
    }

    @Operation(
            summary = "Xem danh sách đánh giá của một Garage",
            description = "Tra cứu các đánh giá & nhận xét của khách hàng dành cho một Garage cứu hộ"
    )
    @GetMapping("/garage/{garageId}")
    public ResponseEntity<ApiResponse<List<RatingResponse>>> getRatingsByGarage(
            @PathVariable("garageId") Long garageId
    ) {
        List<RatingResponse> list = serviceRatingService.getRatingsByGarage(garageId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đánh giá của Garage thành công", list));
    }

    @Operation(
            summary = "[Staff / Admin / Garage] Xem toàn bộ đánh giá dịch vụ",
            description = "Lấy danh sách tất cả đánh giá khách hàng để giám sát chất lượng SLA & CSAT"
    )
    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'GARAGE_OWNER')")
    public ResponseEntity<ApiResponse<List<RatingResponse>>> getAllRatings() {
        List<RatingResponse> list = serviceRatingService.getAllRatings();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đánh giá dịch vụ toàn hệ thống thành công", list));
    }
}
