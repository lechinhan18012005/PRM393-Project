package com.prm393.floodrescue.features.geocoding;

import com.prm393.floodrescue.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/geocoding")
@RequiredArgsConstructor
public class GeocodingController {

    private final OpenStreetMapGeocodingService geocodingService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<GeocodingResult>> search(
            @RequestParam("q") String query) {
        GeocodingResult result = geocodingService.search(query);
        String message = result == null
                ? "Không tìm thấy địa chỉ phù hợp"
                : "Đã tìm thấy địa chỉ trên OpenStreetMap";
        return ResponseEntity.ok(ApiResponse.ok(result, message));
    }

    @GetMapping("/reverse")
    public ResponseEntity<ApiResponse<GeocodingResult>> reverse(
            @RequestParam("lat") double lat,
            @RequestParam("lon") double lon) {
        GeocodingResult result = geocodingService.reverse(lat, lon);
        String message = result == null
                ? "Không tìm thấy địa chỉ cho tọa độ này"
                : "Đã tìm thấy địa chỉ từ tọa độ";
        return ResponseEntity.ok(ApiResponse.ok(result, message));
    }
}
