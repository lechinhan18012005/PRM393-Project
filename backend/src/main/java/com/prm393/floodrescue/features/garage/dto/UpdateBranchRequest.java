package com.prm393.floodrescue.features.garage.dto;

import com.prm393.floodrescue.features.garage.entity.BranchStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBranchRequest {
    private String branchName;
    private String address;
    private Double latitude;
    private Double longitude;
    private String phoneNumber;
    private String rescueVehicles;
    private BranchStatus operatingStatus;
}
