package com.prm393.floodrescue.features.finance.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.features.auth.entity.User;
import com.prm393.floodrescue.features.finance.dto.CreatePayoutRequestDto;
import com.prm393.floodrescue.features.finance.dto.GarageWalletDto;
import com.prm393.floodrescue.features.finance.dto.PayoutRequestResponse;
import com.prm393.floodrescue.features.finance.service.FinanceAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/garages/wallet")
@RequiredArgsConstructor
@PreAuthorize("hasRole('GARAGE_OWNER')")
public class GarageFinanceController {

    private final FinanceAdminService financeAdminService;

    // UC-26: Get garage wallet summary, ledger history, and payout requests
    @GetMapping
    public ResponseEntity<ApiResponse<GarageWalletDto>> getMyWallet(@AuthenticationPrincipal User user) {
        GarageWalletDto wallet = financeAdminService.getGarageWalletSummary(user);
        return ResponseEntity.ok(ApiResponse.success(wallet));
    }

    // UC-26: List payout requests of the current garage owner
    @GetMapping("/payouts")
    public ResponseEntity<ApiResponse<List<PayoutRequestResponse>>> getMyPayoutRequests(@AuthenticationPrincipal User user) {
        List<PayoutRequestResponse> payouts = financeAdminService.getMyPayoutRequests(user);
        return ResponseEntity.ok(ApiResponse.success(payouts));
    }

    // UC-26: Create a new payout request
    @PostMapping("/payouts")
    public ResponseEntity<ApiResponse<PayoutRequestResponse>> createPayoutRequest(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreatePayoutRequestDto request
    ) {
        PayoutRequestResponse created = financeAdminService.createPayoutRequest(user, request);
        return ResponseEntity.ok(ApiResponse.success(
                "Đã gửi yêu cầu rút tiền tới Admin tài chính phê duyệt!",
                created
        ));
    }
}
