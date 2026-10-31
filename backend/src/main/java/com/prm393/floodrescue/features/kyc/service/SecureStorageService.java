package com.prm393.floodrescue.features.kyc.service;

import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;

public interface SecureStorageService {

    /**
     * Stores a sensitive file with server-side AES-256 encryption into private storage (No Public Read).
     *
     * @param file the multipart file (validated for magic bytes and size <= 5MB)
     * @param subFolder folder inside secure storage (e.g., "id-cards", "business-licenses")
     * @return the unique storage key
     */
    String storeSecureFile(MultipartFile file, String subFolder);

    /**
     * Generates a short-lived Pre-signed / HMAC signed URL for temporary authorized viewing.
     *
     * @param storageKey the private object key
     * @param expiry duration (e.g. 5 to 10 minutes)
     * @return signed temporary URL
     */
    String generateTemporaryAccessUrl(String storageKey, Duration expiry);

    /**
     * Streams decrypted file content if valid token and authorization.
     *
     * @param storageKey the storage key
     * @return decrypted bytes
     */
    byte[] retrieveDecryptedFile(String storageKey);

    /**
     * Securely deletes the file from disk/storage (Right to Erasure / Purge).
     *
     * @param storageKey the storage key
     */
    void deleteSecureFile(String storageKey);

    /**
     * Verifies the cryptographic HMAC signature and TTL of a Pre-signed URL.
     *
     * @param storageKey the storage key
     * @param expiresAtEpoch epoch second when URL expires
     * @param signature HMAC signature string
     * @return true if signature is valid and not expired, false otherwise
     */
    boolean validatePresignedSignature(String storageKey, long expiresAtEpoch, String signature);
}
