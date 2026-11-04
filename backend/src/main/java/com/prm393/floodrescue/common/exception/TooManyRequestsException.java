package com.prm393.floodrescue.common.exception;

public class TooManyRequestsException extends BadRequestException {
    public TooManyRequestsException(String message) {
        super(message);
    }
}
