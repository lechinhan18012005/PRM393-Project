package com.prm393.floodrescue.common.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * JPA Attribute Converter for Encrypt-At-Rest (AES-256-GCM).
 * Automatically encrypts plaintext before persisting to Database
 * and decrypts ciphertext when loading entity into memory.
 * Complies with Decree 13/2023/ND-CP requirements for protecting personal identifiers.
 */
@Converter
@Component
public class AttributeEncryptor implements AttributeConverter<String, String> {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128; // bits
    private static final int IV_LENGTH = 12; // bytes for GCM

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public AttributeEncryptor(@Value("${app.security.encryption-key:}") String base64Key) {
        if (base64Key != null && !base64Key.isBlank()) {
            byte[] decoded = Base64.getDecoder().decode(base64Key.trim());
            this.secretKey = new SecretKeySpec(decoded, "AES");
        } else {
            // Fallback deterministic key for dev/demo if not provided in env
            byte[] defaultKey = "MotorbikeRescueDecree13SecureKey!".getBytes(StandardCharsets.UTF_8);
            this.secretKey = new SecretKeySpec(ArraysCopyOf32(defaultKey), "AES");
        }
    }

    private static byte[] ArraysCopyOf32(byte[] src) {
        byte[] key32 = new byte[32]; // 256-bit AES
        System.arraycopy(src, 0, key32, 0, Math.min(src.length, 32));
        return key32;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isBlank()) {
            return null;
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, spec);

            byte[] cipherText = cipher.doFinal(attribute.getBytes(StandardCharsets.UTF_8));

            // Format: [12-byte IV][Ciphertext + Auth Tag] -> Base64
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + cipherText.length);
            buffer.put(iv);
            buffer.put(cipherText);

            return Base64.getEncoder().encodeToString(buffer.array());
        } catch (Exception e) {
            throw new IllegalStateException("Lỗi mã hóa dữ liệu nhạy cảm AES-256: " + e.getMessage(), e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        try {
            byte[] cipherData = Base64.getDecoder().decode(dbData);
            if (cipherData.length <= IV_LENGTH) {
                return null;
            }

            ByteBuffer buffer = ByteBuffer.wrap(cipherData);
            byte[] iv = new byte[IV_LENGTH];
            buffer.get(iv);

            byte[] cipherText = new byte[buffer.remaining()];
            buffer.get(cipherText);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);

            byte[] plainText = cipher.doFinal(cipherText);
            return new String(plainText, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Lỗi giải mã dữ liệu nhạy cảm AES-256: " + e.getMessage(), e);
        }
    }
}
