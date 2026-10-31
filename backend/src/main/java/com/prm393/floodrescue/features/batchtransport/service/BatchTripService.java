package com.prm393.floodrescue.features.batchtransport.service;

import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.batchtransport.dto.BatchTripResponse;
import com.prm393.floodrescue.features.batchtransport.dto.CreateBatchTripRequest;
import com.prm393.floodrescue.features.batchtransport.dto.JoinBatchTripRequest;
import com.prm393.floodrescue.features.batchtransport.dto.JoinBatchTripResponse;
import com.prm393.floodrescue.common.contracts.dto.OrderSnapshot;

import java.util.List;

public interface BatchTripService {
    BatchTripResponse create(User mechanicUser, CreateBatchTripRequest request);

    List<BatchTripResponse> nearby(double latitude, double longitude, double radiusKm,
                                   Long garageId, Double destinationLatitude,
                                   Double destinationLongitude);

    List<BatchTripResponse> mine(User mechanicUser);

    List<BatchTripResponse> allForStaff();

    List<OrderSnapshot> orders(Long tripId, User user);

    BatchTripResponse join(Long tripId, Long orderId, User customer);

    JoinBatchTripResponse createOrderAndJoin(Long tripId, JoinBatchTripRequest request, User customer);

    BatchTripResponse leave(Long tripId, Long orderId, User customer);

    BatchTripResponse convertToPrivate(Long tripId, Long orderId, User customer);

    BatchTripResponse startPickup(Long tripId, User mechanicUser);

    BatchTripResponse markPickedUp(Long tripId, Long orderId, User mechanicUser);

    BatchTripResponse startMoving(Long tripId, User mechanicUser);

    BatchTripResponse markDelivered(Long tripId, Long orderId, String completionImageUrl, User mechanicUser);

    BatchTripResponse complete(Long tripId, User mechanicUser);

    BatchTripResponse cancel(Long tripId, User mechanicUser);
}
