package com.prm393.floodrescue.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Configuration
@ConfigurationProperties(prefix = "payos")
@Getter
@Setter
public class PayOSConfig {

    private String clientId;
    private String apiKey;
    private String checksumKey;
    private String endpoint = "https://api-merchant.payos.vn";
    private String returnUrl = "http://localhost:8080/api/v1/payments/payos/return";
    private String cancelUrl = "http://localhost:8080/api/v1/payments/payos/return?cancel=true";
    private boolean simulationEnabled = false;

    public boolean isRealGatewayConfigured() {
        return clientId != null && !clientId.isBlank()
                && !clientId.startsWith("demo_")
                && !clientId.startsWith("test_")
                && !clientId.startsWith("your_")
                && apiKey != null && !apiKey.isBlank()
                && checksumKey != null && !checksumKey.isBlank();
    }

    /**
     * Tạo chữ ký HMAC-SHA256 chuẩn của PayOS khi khởi tạo link thanh toán:
     * amount=$amount&cancelUrl=$cancelUrl&description=$description&orderCode=$orderCode&returnUrl=$returnUrl
     */
    public String createPaymentRequestSignature(long orderCode, long amount, String description) {
        String dataStr = "amount=" + amount
                + "&cancelUrl=" + (cancelUrl != null ? cancelUrl : "")
                + "&description=" + (description != null ? description : "")
                + "&orderCode=" + orderCode
                + "&returnUrl=" + (returnUrl != null ? returnUrl : "");
        return hmacSha256(dataStr, checksumKey);
    }

    /**
     * Tạo chữ ký HMAC-SHA256 chuẩn của PayOS cho dữ liệu Webhook (sắp xếp key theo thứ tự alphabet).
     */
    public String createWebhookDataSignature(Map<String, Object> dataMap) {
        TreeMap<String, Object> sorted = new TreeMap<>(dataMap);
        String canonical = sorted.entrySet().stream()
                .map(e -> {
                    Object val = e.getValue();
                    String valStr = (val == null || "null".equals(String.valueOf(val))) ? "" : String.valueOf(val);
                    return e.getKey() + "=" + valStr;
                })
                .collect(Collectors.joining("&"));
        return hmacSha256(canonical, checksumKey);
    }

    public String hmacSha256(String data, String key) {
        try {
            String effectiveKey = (key != null && !key.isBlank()) ? key : "demo_checksum_key";
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(effectiveKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256Hmac.init(secretKey);
            byte[] hash = sha256Hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Không thể khởi tạo chữ ký HMAC-SHA256 cho PayOS", e);
        }
    }
}
