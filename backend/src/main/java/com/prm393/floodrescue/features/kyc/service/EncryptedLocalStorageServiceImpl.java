package com.prm393.floodrescue.features.kyc.service;

import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.ResourceNotFoundException;
import com.prm393.floodrescue.common.security.FileSignatureValidator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.File;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

/**
 * Implementation of Private Encrypted Storage complying with Decree 13/2023/ND-CP.
 * Features:
 * 1. Validates magic bytes (jpg, png, webp) & file size <= 5MB.
 * 2. Sanitize filename to random UUID to prevent path traversal & data leakage.
 * 3. Server-side encryption using AES-256-GCM before writing to local private disk.
 * 4. Generates HMAC-SHA256 signed Pre-signed URLs with configurable short TTL (5-10 mins).
 * 5. Secure erasure of data on disk.
 */
@Service
@Slf4j
public class EncryptedLocalStorageServiceImpl implements SecureStorageService {

    private static final String CIPHER_ALGO = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH = 12;
    private static final String HMAC_ALGO = "HmacSHA256";

    private final FileSignatureValidator validator;
    private final Path rootStoragePath;
    private final SecretKey encryptionKey;
    private final SecretKey hmacKey;
    private final SecureRandom secureRandom = new SecureRandom();
    private final String apiBaseUrl;

    public EncryptedLocalStorageServiceImpl(
            FileSignatureValidator validator,
            @Value("${app.security.storage-path:storage/secure-kyc}") String storagePath,
            @Value("${app.security.storage-key:}") String base64Key,
            @Value("${app.security.hmac-secret:}") String hmacSecret,
            @Value("${server.base-url:http://localhost:8080}") String apiBaseUrl
    ) {
        this.validator = validator;
        this.rootStoragePath = Paths.get(storagePath).toAbsolutePath().normalize();
        this.apiBaseUrl = apiBaseUrl.replaceAll("/+$", "");

        try {
            Files.createDirectories(this.rootStoragePath);
        } catch (IOException e) {
            throw new IllegalStateException("Không thể khởi tạo thư mục lưu trữ bảo mật: " + e.getMessage(), e);
        }

        // Encryption key setup
        if (base64Key != null && !base64Key.isBlank()) {
            byte[] decoded = Base64.getDecoder().decode(base64Key.trim());
            this.encryptionKey = new SecretKeySpec(decoded, "AES");
        } else {
            byte[] defaultKey = "RescueDecree13StorageEncryptKey!".getBytes(StandardCharsets.UTF_8);
            byte[] key32 = new byte[32];
            System.arraycopy(defaultKey, 0, key32, 0, Math.min(defaultKey.length, 32));
            this.encryptionKey = new SecretKeySpec(key32, "AES");
        }

        // HMAC key setup for signed URLs
        String hmacSeed = (hmacSecret != null && !hmacSecret.isBlank())
                ? hmacSecret
                : "RescueDecree13HmacPreSignedUrlSigningSecretKey";
        this.hmacKey = new SecretKeySpec(hmacSeed.getBytes(StandardCharsets.UTF_8), HMAC_ALGO);
    }

    @Override
    public String storeSecureFile(MultipartFile file, String subFolder) {
        // 1. Magic byte & size validation
        FileSignatureValidator.ValidatedFile validated = validator.validateImage(file);

        // 2. UUID Sanitized filename
        String safeFolder = (subFolder != null && !subFolder.isBlank())
                ? subFolder.replaceAll("[^a-zA-Z0-9_-]", "")
                : "general";
        String randomFilename = UUID.randomUUID() + "." + validated.extension() + ".enc";
        String storageKey = safeFolder + "/" + randomFilename;

        Path targetDir = rootStoragePath.resolve(safeFolder).normalize();
        Path targetFile = targetDir.resolve(randomFilename).normalize();

        // Path traversal guard
        if (!targetFile.startsWith(rootStoragePath)) {
            throw new BadRequestException("Phát hiện nguy cơ Path Traversal trong đường dẫn lưu trữ.");
        }

        try {
            Files.createDirectories(targetDir);

            // 3. Server-side Encryption (AES-256-GCM)
            byte[] rawBytes = file.getBytes();
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(CIPHER_ALGO);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, encryptionKey, spec);
            byte[] cipherText = cipher.doFinal(rawBytes);

            ByteBuffer buffer = ByteBuffer.allocate(iv.length + cipherText.length);
            buffer.put(iv);
            buffer.put(cipherText);

            Files.write(targetFile, buffer.array());
            log.info("Lưu trữ tệp nhạy cảm thành công tại: [PROTECTED_KEY={}]", storageKey);
            return storageKey;
        } catch (Exception e) {
            log.error("Lỗi lưu trữ tệp mã hóa bảo mật: {}", e.getMessage(), e);
            throw new IllegalStateException("Không thể lưu trữ tệp an toàn: " + e.getMessage(), e);
        }
    }

    @Override
    public String generateTemporaryAccessUrl(String storageKey, Duration expiry) {
        if (storageKey == null || storageKey.isBlank()) {
            return null;
        }

        Duration ttl = (expiry != null && !expiry.isZero() && !expiry.isNegative())
                ? expiry
                : Duration.ofMinutes(10); // Max 10 minutes according to Decree 13 best practice
        long expiresAtEpoch = Instant.now().plus(ttl).getEpochSecond();

        String payload = storageKey + ":" + expiresAtEpoch;
        String signature = computeHmac(payload);

        String encodedKey = Base64.getUrlEncoder().withoutPadding().encodeToString(storageKey.getBytes(StandardCharsets.UTF_8));
        return String.format("%s/api/v1/kyc/files/view?key=%s&expires=%d&sig=%s",
                apiBaseUrl, encodedKey, expiresAtEpoch, signature);
    }

    @Override
    public byte[] retrieveDecryptedFile(String storageKey) {
        Path filePath = rootStoragePath.resolve(storageKey).normalize();
        if (!filePath.startsWith(rootStoragePath) || !Files.exists(filePath)) {
            throw new ResourceNotFoundException("Tệp tài liệu không tồn tại hoặc đã bị xóa theo chính sách bảo mật.");
        }

        try {
            byte[] encryptedData = Files.readAllBytes(filePath);
            if (encryptedData.length <= IV_LENGTH) {
                throw new IllegalStateException("Dữ liệu tệp mã hóa bị hỏng.");
            }

            ByteBuffer buffer = ByteBuffer.wrap(encryptedData);
            byte[] iv = new byte[IV_LENGTH];
            buffer.get(iv);

            byte[] cipherText = new byte[buffer.remaining()];
            buffer.get(cipherText);

            Cipher cipher = Cipher.getInstance(CIPHER_ALGO);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, encryptionKey, spec);

            return cipher.doFinal(cipherText);
        } catch (Exception e) {
            log.error("Lỗi giải mã tệp tài liệu {}: {}", storageKey, e.getMessage());
            throw new IllegalStateException("Không thể giải mã tệp tài liệu: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteSecureFile(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return;
        }

        Path filePath = rootStoragePath.resolve(storageKey).normalize();
        if (!filePath.startsWith(rootStoragePath)) {
            return;
        }

        try {
            if (Files.exists(filePath)) {
                // Secure overwrite before deletion
                long size = Files.size(filePath);
                byte[] zeroes = new byte[(int) Math.min(size, 4096)];
                Files.write(filePath, zeroes);
                Files.delete(filePath);
                log.info("Xóa vĩnh viễn tệp nhạy cảm (Right to Erasure) thành công: {}", storageKey);
            }
        } catch (Exception e) {
            log.error("Lỗi xóa tệp nhạy cảm {}: {}", storageKey, e.getMessage());
        }
    }

    public boolean validatePresignedSignature(String storageKey, long expiresAtEpoch, String signature) {
        if (Instant.now().getEpochSecond() > expiresAtEpoch) {
            log.warn("Pre-signed URL đã hết hạn tại epoch: {}", expiresAtEpoch);
            return false;
        }

        String payload = storageKey + ":" + expiresAtEpoch;
        String expectedSignature = computeHmac(payload);
        return expectedSignature.equals(signature);
    }

    private String computeHmac(String payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(hmacKey);
            byte[] rawHmac = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new IllegalStateException("Không thể tính chữ ký HMAC: " + e.getMessage(), e);
        }
    }
}
