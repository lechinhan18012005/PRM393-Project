package com.prm393.floodrescue.common.utils;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.time.Instant;

public class FlexibleInstantDeserializer extends JsonDeserializer<Instant> {

    @Override
    public Instant deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String text = p.getText();
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            return DateTimeUtils.parseFlexibleInstant(text);
        } catch (Exception e) {
            throw new IOException("Lỗi deserialize Instant từ chuỗi: '" + text + "'", e);
        }
    }
}
