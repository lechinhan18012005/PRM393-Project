package com.prm393.floodrescue.features.garage.service;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.garage.dto.ApproveGarageRequest;
import com.prm393.floodrescue.features.garage.dto.GarageResponse;
import com.prm393.floodrescue.features.garage.dto.RegisterGarageRequest;
import com.prm393.floodrescue.features.garage.entity.Garage;

import java.util.List;

public interface GarageService {

    GarageResponse registerGarage(User user, RegisterGarageRequest request);

    GarageResponse resubmit(User user, RegisterGarageRequest request);

    GarageResponse getCurrentGarage(User user);

    List<GarageResponse> getPendingGarages();

    List<GarageResponse> getAllGarages();

    GarageResponse getGarageById(Long id);

    GarageResponse moderateGarage(Long garageId, ApproveGarageRequest request);

    GarageResponse mapToResponse(Garage garage);
}
