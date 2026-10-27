package com.prm393.floodrescue.common.exception;

public class UploadUnavailableException extends RuntimeException {
    public static final String USER_MESSAGE =
            "Hiện chưa thể tải ảnh lên hệ thống. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.";

    public UploadUnavailableException(Throwable cause) {
        super(USER_MESSAGE, cause);
    }
}
