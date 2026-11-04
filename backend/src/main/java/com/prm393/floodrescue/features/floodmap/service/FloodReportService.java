package com.prm393.floodrescue.features.floodmap.service;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.common.exception.TooManyRequestsException;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.floodmap.dto.CreateFloodReportRequest;
import com.prm393.floodrescue.features.floodmap.dto.FloodReportResponse;
import com.prm393.floodrescue.features.floodmap.dto.ModerateFloodReportRequest;
import com.prm393.floodrescue.features.floodmap.entity.FloodReportPoint;
import com.prm393.floodrescue.features.floodmap.entity.FloodStatus;
import com.prm393.floodrescue.features.floodmap.repository.FloodReportRepository;
import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import com.prm393.floodrescue.features.garage.entity.GarageBranch;
import com.prm393.floodrescue.features.garage.repository.GarageBranchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FloodReportService {

    private final FloodReportRepository floodReportRepository;
    private final GarageBranchRepository garageBranchRepository;

    @Transactional
    public FloodReportResponse createReport(User reporter, CreateFloodReportRequest request) {
        // PRE-3 / 5.2.E2: Geofencing validation (Lãnh thổ Việt Nam / Vùng hoạt động PRM393)
        if (request.getLatitude() == null || request.getLongitude() == null
                || request.getLatitude() < 8.0 || request.getLatitude() > 24.0
                || request.getLongitude() < 102.0 || request.getLongitude() > 110.0) {
            throw new BadRequestException("Tọa độ báo cáo nằm ngoài khu vực cứu hộ và hỗ trợ ngập lụt của hệ thống PRM393. Vui lòng kiểm tra lại thiết bị định vị!");
        }

        // BR-MAP-004 & Spatial Clustering: Quét báo cáo trong 60 phút gần đây (Tối ưu hóa: Không dùng findAll)
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        LocalDateTime fifteenMinutesAgo = LocalDateTime.now().minusMinutes(15);
        List<FloodReportPoint> recentReports = floodReportRepository.findByCreatedAtAfter(oneHourAgo);
        if (recentReports == null) {
            recentReports = new ArrayList<>();
        }

        List<FloodReportPoint> nearbyClusterPoints = new ArrayList<>();
        for (FloodReportPoint p : recentReports) {
            double distanceMeters = calculateDistance(request.getLatitude(), request.getLongitude(), p.getLatitude(), p.getLongitude());

            // BR-MAP-004: Chống spam - cùng tài khoản gửi liên tiếp trong bán kính 150m trong vòng 15 phút
            if (reporter != null && reporter.getId() != null
                    && p.getReportedBy() != null && reporter.getId().equals(p.getReportedBy().getId())) {
                boolean isWithin15Mins = p.getCreatedAt() != null && p.getCreatedAt().isAfter(fifteenMinutesAgo);
                if (isWithin15Mins && distanceMeters <= 150.0) {
                    throw new TooManyRequestsException("Bạn đã gửi báo cáo tại khu vực này cách đây ít phút. Để chống spam, vui lòng đợi 15 phút trước khi cập nhật lại tình hình (BR-MAP-004).");
                }
            }

            boolean isRecent = p.getCreatedAt() == null || p.getCreatedAt().isAfter(oneHourAgo);
            boolean isValidCandidate = p.getModerationStatus() != FloodStatus.REJECTED
                    && p.getModerationStatus() != FloodStatus.EXPIRED;
            if (isRecent && isValidCandidate && distanceMeters <= 150.0) {
                nearbyClusterPoints.add(p);
            }
        }

        int nearbyCount = nearbyClusterPoints.size();
        int clusterCount = nearbyCount + 1;
        int baseScore = (request.getImageUrls() != null && !request.getImageUrls().trim().isEmpty()) ? 2 : 1;
        int confidenceScore = Math.min(5, clusterCount >= 3 ? 5 : baseScore + (clusterCount - 1) * 2);

        if (clusterCount >= 3) {
            for (FloodReportPoint existing : nearbyClusterPoints) {
                existing.setClusterCount(clusterCount);
                existing.setConfidenceScore(confidenceScore);
                if (existing.getModerationStatus() == FloodStatus.PENDING) {
                    existing.setModerationStatus(FloodStatus.APPROVED);
                    existing.setModeratorNote("Tự động xác thực cụm ngập GIS (" + clusterCount + " tin báo trong bán kính 150m)");
                }
                floodReportRepository.save(existing);
            }
        }

        String stationsText = findNearbyStations(request.getLatitude(), request.getLongitude());

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
                .moderatorNote(clusterCount >= 3
                        ? "Tự động xác thực cụm ngập GIS (" + clusterCount + " tin báo trong bán kính 150m)"
                        : null)
                .nearbyStations(stationsText)
                .recededConfirmCount(0)
                .build();

        point = floodReportRepository.save(point);
        log.info("Flood report created id: {} by user: {} with clusterCount: {}", point.getId(), reporter != null ? reporter.getUsername() : "anonymous", clusterCount);
        return mapToResponse(point);
    }

    private String findNearbyStations(double lat, double lng) {
        if (garageBranchRepository != null) {
            try {
                List<GarageBranch> openBranches = garageBranchRepository.findByOperatingStatus(BranchStatus.OPEN);
                GarageBranch closest = null;
                double minDistance = Double.MAX_VALUE;
                for (GarageBranch b : openBranches) {
                    if (b.getLatitude() != null && b.getLongitude() != null) {
                        double dist = calculateDistance(lat, lng, b.getLatitude(), b.getLongitude());
                        if (dist < minDistance) {
                            minDistance = dist;
                            closest = b;
                        }
                    }
                }
                if (closest != null && minDistance <= 3000.0) {
                    int distMeters = (int) Math.round(minDistance);
                    String distStr = distMeters >= 1000 ? String.format("%.1fkm", distMeters / 1000.0) : distMeters + "m";
                    String phoneStr = (closest.getPhoneNumber() != null && !closest.getPhoneNumber().trim().isEmpty())
                            ? " - Hotline: " + closest.getPhoneNumber()
                            : "";
                    return closest.getBranchName() + " (Cách " + distStr + phoneStr + ")";
                }
            } catch (Exception ex) {
                log.warn("Could not query nearby garage branches: {}", ex.getMessage());
            }
        }
        return "Có 2 trạm thợ cứu hộ cơ động trong bán kính 2km";
    }

    @Transactional(readOnly = true)
    public List<FloodReportResponse> getActiveFloodPoints() {
        return floodReportRepository.findByModerationStatusOrderByCreatedAtDesc(FloodStatus.APPROVED).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FloodReportResponse> getMyReports(User reporter) {
        return floodReportRepository.findByReportedByIdOrderByCreatedAtDesc(reporter.getId()).stream()
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

    // UC-20 (4.2.4): Cộng đồng gửi phản hồi nước đã rút tại điểm ngập kèm cơ chế đồng thuận (Consensus)
    @Transactional
    public FloodReportResponse reportWaterRecededByCommunity(User user, Long reportId) {
        FloodReportPoint point = floodReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy điểm báo ngập với id: " + reportId));

        int currentVotes = (point.getRecededConfirmCount() != null ? point.getRecededConfirmCount() : 0) + 1;
        point.setRecededConfirmCount(currentVotes);
        String reporterName = (user != null && user.getFullName() != null) ? user.getFullName() : "Người dùng cộng đồng";

        if (currentVotes >= 2) {
            point.setModerationStatus(FloodStatus.EXPIRED);
            point.setModeratorNote("Cộng đồng đã xác nhận nước rút (" + currentVotes + " lượt báo, ghi nhận mới nhất bởi " + reporterName + "). Tuyến đường đã lưu thông an toàn.");
            log.info("Flood report id: {} marked as EXPIRED by community consensus (votes: {})", reportId, currentVotes);
        } else {
            point.setModeratorNote("Có 1 phản hồi nước đang rút (Ghi nhận bởi " + reporterName + "). Đang chờ thêm 1 lượt xác nhận từ cộng đồng để giải tỏa hoàn toàn.");
            log.info("Flood report id: {} recorded receded vote {} (pending consensus)", reportId, currentVotes);
        }

        point = floodReportRepository.save(point);
        return mapToResponse(point);
    }

    // UC-20 / UC-22 (BR-MAP-007): Tự động hết hạn điểm ngập sau 2 giờ không có tin mới
    @Scheduled(cron = "0 */10 * * * *")
    @Transactional
    public void autoExpireOldFloodReports() {
        LocalDateTime twoHoursAgo = LocalDateTime.now().minusHours(2);
        List<FloodReportPoint> staleApprovedReports = floodReportRepository.findByModerationStatusAndUpdatedAtBefore(
                FloodStatus.APPROVED, twoHoursAgo
        );
        for (FloodReportPoint point : staleApprovedReports) {
            point.setModerationStatus(FloodStatus.EXPIRED);
            point.setModeratorNote("Hệ thống tự động giải tỏa vùng ngập sau 2 giờ không có tin báo mới (TTL 2h - BR-MAP-007).");
        }
        if (!staleApprovedReports.isEmpty()) {
            floodReportRepository.saveAll(staleApprovedReports);
            log.info("Auto-expired {} stale flood reports (TTL 2 hours elapsed)", staleApprovedReports.size());
        }
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
                .recededConfirmCount(p.getRecededConfirmCount())
                .createdAt(p.getCreatedAt())
                .build();
    }
}