package com.prm393.floodrescue.features.upload.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.common.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/upload")
@RequiredArgsConstructor
public class UploadController {

    private final CloudinaryService cloudinaryService;

    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "general") String folder
    ) {
        String url = cloudinaryService.uploadImage(file, folder);
        return ResponseEntity.ok(ApiResponse.success("Upload ảnh thành công lên Cloudinary", Map.of("url", url)));
    }
}
