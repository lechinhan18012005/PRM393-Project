package com.prm393.floodrescue.features.floodmap.service;

import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.floodmap.dto.CreateFloodReportRequest;
import com.prm393.floodrescue.features.floodmap.dto.FloodReportResponse;
import com.prm393.floodrescue.features.floodmap.dto.ModerateFloodReportRequest;
import com.prm393.floodrescue.features.floodmap.entity.FloodReportPoint;
import com.prm393.floodrescue.features.floodmap.entity.FloodStatus;
import com.prm393.floodrescue.features.floodmap.repository.FloodReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FloodReportService {

    private final FloodReportRepository floodReportRepository;

    @Transactional
    public FloodReportResponse createReport(User reporter, CreateFloodReportRequest request) {
        // Spatial Clustering logic (SRS FEAT-10 & Main Workflow 4):
        // Scan active/recent reports within 100 meters (0.1km) in the last 60 minutes
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        List<FloodReportPoint> recentReports = floodReportRepository.findAll();

        int nearbyCount = 0;
        for (FloodReportPoint p : recentReports) {
            if (p.getCreatedAt().isAfter(oneHourAgo)) {
                double distanceMeters = calculateDistance(request.getLatitude(), request.getLongitude(), p.getLatitude(), p.getLongitude());
                if (distanceMeters <= 150) {
                    nearbyCount++;
                }
            }
        }

        int clusterCount = nearbyCount + 1;
        int confidenceScore = Math.min(5, clusterCount >= 3 ? 5 : clusterCount * 2);

        String stationsText = "Có 2 trạm thợ cứu hộ cơ động trong bán kính 2km";

        FloodReportPoint point = FloodReportPoint.builder()
                .reportedBy(reporter)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .address(request.getAddress())
                .waterDepthLevel(request.getWaterDepthLevel())
                .imageUrls(request.getImageUrls())
                .description(request.getDescription())
                .confidenceScore(confidenceScore)
                .clusterCount(clusterCount)
                .moderationStatus(clusterCount >= 3 ? FloodStatus.APPROVED : FloodStatus.PENDING)
                .nearbyStations(stationsText)
                .build();

        point = floodReportRepository.save(point);
        log.info("Flood report created id: {} by user: {} with clusterCount: {}", point.getId(), reporter.getUsername(), clusterCount);
        return mapToResponse(point);
    }

    @Transactional(readOnly = true)
    public List<FloodReportResponse> getActiveFloodPoints() {
        return floodReportRepository.findByModerationStatusOrderByCreatedAtDesc(FloodStatus.APPROVED).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FloodReportResponse> getAllReportsForStaff() {
        return floodReportRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public FloodReportResponse moderateReport(User staff, Long reportId, ModerateFloodReportRequest request) {
        FloodReportPoint point = floodReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy điểm báo ngập với id: " + reportId));

        point.setModerationStatus(request.getStatus());
        point.setModeratedBy(staff);
        if (request.getModeratorNote() != null) {
            point.setModeratorNote(request.getModeratorNote());
        }
        if (request.getNearbyStations() != null) {
            point.setNearbyStations(request.getNearbyStations());
        }

        point = floodReportRepository.save(point);
        log.info("Flood report id: {} moderated to {} by staff: {}", reportId, request.getStatus(), staff.getUsername());
        return mapToResponse(point);
    }

    @Transactional
    public FloodReportResponse resolveWaterReceded(User staff, Long reportId) {
        FloodReportPoint point = floodReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy điểm báo ngập với id: " + reportId));

        point.setModerationStatus(FloodStatus.EXPIRED);
        point.setModeratedBy(staff);
        point.setModeratorNote("Đã xác nhận nước rút hoàn toàn, tuyến đường lưu thông an toàn.");

        point = floodReportRepository.save(point);
        log.info("Flood report id: {} resolved (water receded) by staff: {}", reportId, staff.getUsername());
        return mapToResponse(point);
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000; // Radius of Earth in meters
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    public FloodReportResponse mapToResponse(FloodReportPoint p) {
        return FloodReportResponse.builder()
                .id(p.getId())
                .reportedById(p.getReportedBy() != null ? p.getReportedBy().getId() : null)
                .reportedByName(p.getReportedBy() != null ? p.getReportedBy().getFullName() : "Người dùng cộng đồng")
                .latitude(p.getLatitude())
                .longitude(p.getLongitude())
                .address(p.getAddress())
                .waterDepthLevel(p.getWaterDepthLevel())
                .imageUrls(p.getImageUrls())
                .description(p.getDescription())
                .confidenceScore(p.getConfidenceScore())
                .clusterCount(p.getClusterCount())
                .moderationStatus(p.getModerationStatus())
                .moderatedById(p.getModeratedBy() != null ? p.getModeratedBy().getId() : null)
                .moderatedByName(p.getModeratedBy() != null ? p.getModeratedBy().getFullName() : null)
                .moderatorNote(p.getModeratorNote())
                .nearbyStations(p.getNearbyStations())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
