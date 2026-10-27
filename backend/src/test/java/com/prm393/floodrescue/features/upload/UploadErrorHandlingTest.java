package com.prm393.floodrescue.features.upload;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.cloudinary.utils.ObjectUtils;
import com.prm393.floodrescue.common.exception.GlobalExceptionHandler;
import com.prm393.floodrescue.common.exception.UploadUnavailableException;
import com.prm393.floodrescue.common.service.CloudinaryService;
import com.prm393.floodrescue.features.upload.controller.UploadController;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.io.IOException;
import java.util.Map;

class UploadErrorHandlingTest {
    private Uploader uploader;
    private MockMvc mvc;
    private final MockMultipartFile image =
            new MockMultipartFile("file", "license.jpg", "image/jpeg", new byte[] {1, 2, 3});

    @BeforeEach
    void setup() {
        uploader = mock(Uploader.class);
        Cloudinary cloudinary =
                spy(
                        new Cloudinary(
                                ObjectUtils.asMap(
                                        "cloud_name",
                                        "test-cloud",
                                        "api_key",
                                        "test-key",
                                        "api_secret",
                                        "test-secret")));
        doReturn(uploader).when(cloudinary).uploader();
        mvc = mvc(new CloudinaryService(cloudinary));
    }

    private MockMvc mvc(CloudinaryService service) {
        return MockMvcBuilders.standaloneSetup(new UploadController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void invalidCloudNameIs503WithoutProviderDetails() throws Exception {
        when(uploader.upload(any(), anyMap()))
                .thenThrow(
                        new RuntimeException("Invalid cloud_name motorbike_flood_rescue_platform"));
        mvc.perform(multipart("/api/v1/upload/image").file(image))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(jsonPath("$.message").value(UploadUnavailableException.USER_MESSAGE))
                .andExpect(
                        content()
                                .string(
                                        org.hamcrest.Matchers.not(
                                                org.hamcrest.Matchers.containsString(
                                                        "motorbike_flood_rescue_platform"))));
    }

    @Test
    void networkFailureDoesNotReturnFakeSuccess() throws Exception {
        when(uploader.upload(any(), anyMap())).thenThrow(new IOException("connection failed"));
        mvc.perform(multipart("/api/v1/upload/image").file(image))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value(UploadUnavailableException.USER_MESSAGE))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void demoConfigurationDoesNotReturnFakeUrl() throws Exception {
        mvc(new CloudinaryService(
                        new Cloudinary(
                                ObjectUtils.asMap(
                                        "cloud_name",
                                        "demo",
                                        "api_key",
                                        "demo",
                                        "api_secret",
                                        "demo"))))
                .perform(multipart("/api/v1/upload/image").file(image))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void emptyFileIsClientError() throws Exception {
        mvc.perform(
                        multipart("/api/v1/upload/image")
                                .file(new MockMultipartFile("file", new byte[0])))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(uploader);
    }

    @Test
    void missingUrlDoesNotReportSuccess() throws Exception {
        when(uploader.upload(any(), anyMap())).thenReturn(Map.of());
        mvc.perform(multipart("/api/v1/upload/image").file(image))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void successfulUploadReturnsRealUrl() throws Exception {
        when(uploader.upload(any(), anyMap()))
                .thenReturn(
                        Map.of(
                                "secure_url",
                                "https://res.cloudinary.com/test-cloud/image/upload/license.jpg"));
        mvc.perform(multipart("/api/v1/upload/image").file(image))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(
                        jsonPath("$.data.url")
                                .value(
                                        "https://res.cloudinary.com/test-cloud/image/upload/license.jpg"));
    }

    @Test
    void multipartSizeLimitReturns413() throws Exception {
        CloudinaryService service = mock(CloudinaryService.class);
        when(service.uploadImage(any(), anyString()))
                .thenThrow(new MaxUploadSizeExceededException(5L * 1024 * 1024));
        mvc(service)
                .perform(multipart("/api/v1/upload/image").file(image))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(
                        jsonPath("$.message")
                                .value(
                                        "Ảnh vượt quá dung lượng cho phép. Vui lòng chọn ảnh tối đa"
                                            + " 5 MB."));
    }
}
