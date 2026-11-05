package com.prm393.floodrescue.features.health;

import com.prm393.floodrescue.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/health", "/health"})
@Tag(name = "Health Check", description = "Kiểm tra trạng thái hoạt động của hệ thống backend")
public class HealthController {

    @GetMapping
    @Operation(summary = "Kiểm tra kết nối và độ khả dụng của hệ thống")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkHealth() {
        Map<String, Object> statusData = Map.of(
                "status", "UP",
                "service", "floodrescue-backend",
                "timestamp", Instant.now().toString()
        );
        return ResponseEntity.ok(ApiResponse.success("Hệ thống hoạt động bình thường", statusData));
    }
}
