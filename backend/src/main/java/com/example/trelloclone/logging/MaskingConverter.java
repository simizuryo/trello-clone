package com.example.trelloclone.logging;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.pattern.CompositeConverter;

/**
 * Logback pattern converter for the plain-text format: {@code %mask(%msg)}.
 */
public class MaskingConverter extends CompositeConverter<ILoggingEvent> {

    @Override
    protected String transform(ILoggingEvent event, String in) {
        return SensitiveDataMasker.mask(in);
    }
}
