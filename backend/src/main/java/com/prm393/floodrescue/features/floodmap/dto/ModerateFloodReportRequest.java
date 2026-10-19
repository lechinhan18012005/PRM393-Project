package com.prm393.floodrescue.features.floodmap.dto;

import com.prm393.floodrescue.features.floodmap.entity.FloodStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerateFloodReportRequest {

    @NotNull(message = "Trạng thái phê duyệt không được để trống")
    private FloodStatus status; // APPROVED, REJECTED, EXPIRED

    private String moderatorNote;
    private String nearbyStations;
}
