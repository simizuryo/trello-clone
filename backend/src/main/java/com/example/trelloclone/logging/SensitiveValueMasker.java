package com.example.trelloclone.logging;

import com.fasterxml.jackson.core.JsonStreamContext;
import net.logstash.logback.mask.ValueMasker;

/**
 * Applies {@link SensitiveDataMasker} to every string value written by the JSON encoder
 * (message, stack trace, structured arguments). Field-name based masking is configured
 * separately in logback-spring.xml.
 */
public class SensitiveValueMasker implements ValueMasker {

    @Override
    public Object mask(JsonStreamContext context, Object value) {
        if (value instanceof CharSequence text) {
            String original = text.toString();
            String masked = SensitiveDataMasker.mask(original);
            return masked.equals(original) ? null : masked;
        }
        return null;
    }
}
