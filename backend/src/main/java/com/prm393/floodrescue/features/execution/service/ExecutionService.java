package com.prm393.floodrescue.features.execution.service;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.execution.dto.ExecutionActionResponse;
import com.prm393.floodrescue.features.execution.dto.ExecutionRecordResponse;

import java.util.List;

public interface ExecutionService {
    ExecutionActionResponse start(Long orderId, User mechanicUser);

    ExecutionActionResponse updateProgress(Long orderId, String note, String evidenceImageUrl, User mechanicUser);

    ExecutionActionResponse markPickedUp(Long orderId, User mechanicUser);

    ExecutionActionResponse transfer(Long orderId, Long destinationBranchId, User mechanicUser);

    ExecutionActionResponse markDelivered(Long orderId, String imageUrl, User mechanicUser);

    ExecutionActionResponse requestCompletion(Long orderId, String imageUrl, User mechanicUser);

    List<ExecutionRecordResponse> history(Long orderId, User mechanicUser);
}
