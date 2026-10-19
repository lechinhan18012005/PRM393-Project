package com.prm393.floodrescue.common.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    @Value("${cloudinary.cloud-name:demo}")
    private String cloudName;

    /**
     * Upload an image file to Cloudinary.
     * Falls back to a simulated placeholder URL if Cloudinary credentials are default demo or in case of network error during offline testing.
     */
    public String uploadImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        if ("demo".equalsIgnoreCase(cloudName) || "your_cloud_name".equalsIgnoreCase(cloudName)) {
            String fakeUrl = "https://res.cloudinary.com/demo/image/upload/" + folder + "/" + UUID.randomUUID() + "-" + file.getOriginalFilename();
            log.info("Cloudinary is using default/demo cloud-name. Simulated image URL: {}", fakeUrl);
            return fakeUrl;
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", "floodrescue/" + folder,
                    "resource_type", "auto"
            ));
            return (String) uploadResult.get("secure_url");
        } catch (IOException e) {
            log.error("Failed to upload image to Cloudinary: {}", e.getMessage());
            // Fallback simulated URL so presentation/demo is never interrupted by network issues
            return "https://res.cloudinary.com/demo/image/upload/floodrescue/" + folder + "/" + UUID.randomUUID() + ".jpg";
        }
    }
}
