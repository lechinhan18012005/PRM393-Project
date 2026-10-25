package com.prm393.floodrescue.features.payment.service;

import com.fasterxml.jackson.databind.*;
import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.config.PayOSConfig;
import com.prm393.floodrescue.features.payment.dto.CreatePaymentLinkResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class PayOSGatewayClient {
    private final PayOSConfig config;
    private final ObjectMapper mapper;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();

    public JsonNode ensureLink(CreatePaymentLinkResponse attempt, boolean firstRequest) {
        if (!firstRequest) {
            JsonNode recovered = query(attempt);
            if (recovered != null) return recovered;
        }
        try {
            String signature = config.createPaymentRequestSignature(attempt.getPayosOrderCode(),
                    attempt.getAmount().longValueExact(), attempt.getPaymentContent());
            var body = Map.of("orderCode", attempt.getPayosOrderCode(), "amount", attempt.getAmount().longValueExact(),
                    "description", attempt.getPaymentContent(), "returnUrl", config.getReturnUrl(),
                    "cancelUrl", config.getCancelUrl(), "signature", signature);
            var response = send("/v2/payment-requests", mapper.writeValueAsString(body));
            JsonNode root = mapper.readTree(response.body());
            if (response.statusCode() == 200 && "00".equals(root.path("code").asText())) {
                return checked(attempt, root.path("data"));
            }
        } catch (Exception ignored) {
            // Outcome is unknown. Never allocate another merchant orderCode.
        }
        JsonNode recovered = query(attempt);
        if (recovered != null) return recovered;
        throw new BadRequestException("Chưa xác định được kết quả tạo link PayOS. Vui lòng thử lại; hệ thống giữ nguyên mã giao dịch.");
    }

    private JsonNode query(CreatePaymentLinkResponse attempt) {
        try {
            var response = send("/v2/payment-requests/" + attempt.getPayosOrderCode(), null);
            JsonNode root = mapper.readTree(response.body());
            if (response.statusCode() == 200 && "00".equals(root.path("code").asText())) {
                return checked(attempt, root.path("data"));
            }
            // Only an explicit not-found response permits retrying CREATE with the SAME code.
            if (response.statusCode() == 404 || "231".equals(root.path("code").asText())) return null;
        } catch (Exception ignored) { }
        throw new BadRequestException("Không thể tra cứu giao dịch PayOS. Mã giao dịch được giữ lại để phục hồi, không tạo link khác.");
    }

    /** Status checks must never create another payment link. */
    public JsonNode findLink(CreatePaymentLinkResponse attempt) {
        return query(attempt);
    }

    private JsonNode checked(CreatePaymentLinkResponse attempt, JsonNode data) {
        if (!data.path("orderCode").canConvertToLong()
                || data.path("orderCode").asLong() != attempt.getPayosOrderCode()
                || !data.path("amount").isNumber()
                || data.path("amount").decimalValue().compareTo(attempt.getAmount()) != 0
                || (data.hasNonNull("currency") && !"VND".equals(data.path("currency").asText()))) {
            throw new BadRequestException("Thông tin link PayOS không khớp giao dịch đã lưu.");
        }
        if ("PAID".equals(data.path("status").asText()) && (!data.path("amountPaid").isNumber()
                || data.path("amountPaid").decimalValue().compareTo(attempt.getAmount()) != 0)) {
            throw new BadRequestException("Khoản tiền nhận tại PayOS cần đối soát trước khi hoàn tất đơn.");
        }
        if (data.path("paymentLinkId").asText(data.path("id").asText("")).isBlank()) {
            throw new BadRequestException("PayOS chưa trả mã link hợp lệ.");
        }
        return data;
    }

    private HttpResponse<String> send(String path, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create(config.getEndpoint() + path))
                .timeout(Duration.ofSeconds(5)).header("x-client-id", config.getClientId())
                .header("x-api-key", config.getApiKey()).header("Content-Type", "application/json");
        if (body == null) request.GET();
        else request.POST(HttpRequest.BodyPublishers.ofString(body));
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
