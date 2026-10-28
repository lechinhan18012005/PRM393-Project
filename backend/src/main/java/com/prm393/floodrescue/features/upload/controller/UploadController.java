package com.prm393.floodrescue.features.upload.controller;

import com.prm393.floodrescue.common.dto.ApiResponse;
import com.prm393.floodrescue.common.service.CloudinaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/upload")
@RequiredArgsConstructor
@Tag(name = "Upload", description = "Tải file và hình ảnh lên hệ thống lưu trữ Cloudinary")
public class UploadController {

    private final CloudinaryService cloudinaryService;

    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tải file ảnh lên Cloudinary")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", defaultValue = "general") String folder
    ) {
        String url = cloudinaryService.uploadImage(file, folder);
        return ResponseEntity.ok(ApiResponse.success("Upload ảnh thành công lên Cloudinary", Map.of("url", url)));
    }
}
