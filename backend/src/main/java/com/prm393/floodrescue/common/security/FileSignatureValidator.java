package com.prm393.floodrescue.common.security;

import com.prm393.floodrescue.common.exception.BadRequestException;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;

/**
 * Validates actual binary content (magic numbers / file signatures)
 * to strictly prevent MIME-type spoofing and malicious file execution.
 * Only allows JPG, PNG, and WebP under 5MB.
 */
@Component
public class FileSignatureValidator {

    public static final long MAX_FILE_SIZE = 5L * 1024 * 1024; // 5 MB exactly

    // Magic Byte Signatures
    private static final byte[] JPEG_MAGIC = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC = new byte[]{
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
    };
    private static final byte[] RIFF_HEADER = new byte[]{0x52, 0x49, 0x46, 0x46}; // "RIFF"
    private static final byte[] WEBP_HEADER = new byte[]{0x57, 0x45, 0x42, 0x50}; // "WEBP"

    public record ValidatedFile(String mimeType, String extension) {}

    public ValidatedFile validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Tệp tải lên không được để trống.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("Dung lượng tệp vượt quá giới hạn tối đa 5MB (Thực tế: " + file.getSize() + " bytes).");
        }

        byte[] header = new byte[12];
        try (InputStream is = file.getInputStream()) {
            int read = is.read(header);
            if (read < 12) {
                throw new BadRequestException("Tệp không hợp lệ hoặc dữ liệu bị hỏng.");
            }
        } catch (IOException e) {
            throw new BadRequestException("Không thể đọc tệp để kiểm tra chữ ký nhị phân: " + e.getMessage());
        }

        // 1. Check JPEG
        if (header[0] == JPEG_MAGIC[0] && header[1] == JPEG_MAGIC[1] && header[2] == JPEG_MAGIC[2]) {
            return new ValidatedFile("image/jpeg", "jpg");
        }

        // 2. Check PNG
        if (Arrays.equals(Arrays.copyOfRange(header, 0, 8), PNG_MAGIC)) {
            return new ValidatedFile("image/png", "png");
        }

        // 3. Check WEBP (RIFF at 0..3, WEBP at 8..11)
        if (Arrays.equals(Arrays.copyOfRange(header, 0, 4), RIFF_HEADER)
                && Arrays.equals(Arrays.copyOfRange(header, 8, 12), WEBP_HEADER)) {
            return new ValidatedFile("image/webp", "webp");
        }

        throw new BadRequestException(
                "Định dạng tệp không được hỗ trợ. Chỉ chấp nhận ảnh JPG, PNG hoặc WebP hợp lệ qua kiểm tra Magic Bytes."
        );
    }
}
