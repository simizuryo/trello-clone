package com.example.trelloclone.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

import static net.logstash.logback.argument.StructuredArguments.kv;

/**
 * Assigns a correlation ID to every request and writes one access log line per request.
 *
 * <p>The ID is taken from the {@code X-Request-Id} request header when it is well-formed
 * (so the frontend can correlate its own logs), otherwise a new UUID is generated. It is
 * put in the MDC as {@code requestId} for every log line written while handling the
 * request, and echoed back in the {@code X-Request-Id} response header.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestCorrelationFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Request-Id";
    public static final String MDC_KEY = "requestId";

    // Restrict to a safe charset/length so a client cannot inject arbitrary text into logs.
    private static final Pattern VALID_ID = Pattern.compile("[A-Za-z0-9._-]{1,64}");

    private static final Logger log = LoggerFactory.getLogger(RequestCorrelationFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String requestId = resolveRequestId(request.getHeader(HEADER));
        MDC.put(MDC_KEY, requestId);
        response.setHeader(HEADER, requestId);

        long start = System.nanoTime();
        Throwable failure = null;
        try {
            chain.doFilter(request, response);
        } catch (IOException | ServletException | RuntimeException e) {
            failure = e;
            throw e;
        } finally {
            logCompletion(request, response, (System.nanoTime() - start) / 1_000_000, failure);
            MDC.remove(MDC_KEY);
        }
    }

    static String resolveRequestId(String header) {
        if (header != null && VALID_ID.matcher(header).matches()) {
            return header;
        }
        return UUID.randomUUID().toString();
    }

    private void logCompletion(HttpServletRequest request, HttpServletResponse response, long durationMs,
                               Throwable failure) {
        int status = failure != null ? HttpServletResponse.SC_INTERNAL_SERVER_ERROR : response.getStatus();
        Object[] args = {
                kv("method", request.getMethod()),
                kv("path", request.getRequestURI()),
                kv("status", status),
                kv("durationMs", durationMs)
        };
        String message = "HTTP request completed {} {} {} {}";

        if (failure != null) {
            log.error(message, append(args, failure));
        } else if (status >= 500) {
            log.error(message, args);
        } else if (request.getRequestURI().startsWith("/actuator")) {
            log.debug(message, args);
        } else {
            log.info(message, args);
        }
    }

    private static Object[] append(Object[] args, Throwable failure) {
        Object[] withFailure = new Object[args.length + 1];
        System.arraycopy(args, 0, withFailure, 0, args.length);
        withFailure[args.length] = failure;
        return withFailure;
    }
}
