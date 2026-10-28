package com.prm393.floodrescue.common.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.prm393.floodrescue.common.exception.BadRequestException;
import com.prm393.floodrescue.common.exception.UploadUnavailableException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {
    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;
    private final Cloudinary cloudinary;

    public String uploadImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn ảnh có nội dung để tải lên.");
        }
        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new BadRequestException(
                    "Ảnh vượt quá dung lượng cho phép. Vui lòng chọn ảnh tối đa 5 MB.");
        }
        if (isPlaceholder(cloudinary.config.cloudName)
                || isPlaceholder(cloudinary.config.apiKey)
                || isPlaceholder(cloudinary.config.apiSecret)) {
            log.error(
                    "Image upload unavailable: Cloudinary credentials are missing or placeholders");
            throw new UploadUnavailableException(null);
        }
        try {
            Map<?, ?> result =
                    cloudinary
                            .uploader()
                            .upload(
                                    file.getBytes(),
                                    ObjectUtils.asMap(
                                            "folder",
                                            "floodrescue/" + folder,
                                            "resource_type",
                                            "image"));
            Object url = result == null ? null : result.get("secure_url");
            if (!(url instanceof String imageUrl) || !imageUrl.startsWith("https://")) {
                throw new IllegalStateException("Cloudinary did not return a secure image URL");
            }
            return imageUrl;
        } catch (IOException | RuntimeException ex) {
            // Details belong in server logs, never in the public API response.
            log.error("Image upload to Cloudinary failed", ex);
            throw new UploadUnavailableException(ex);
        }
    }

    private boolean isPlaceholder(String value) {
        return value == null
                || value.isBlank()
                || "demo".equalsIgnoreCase(value.trim())
                || value.trim().startsWith("your_");
    }
}
