package com.example.trelloclone.logging;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RequestCorrelationFilterTest {

    private static final String UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

    private final RequestCorrelationFilter filter = new RequestCorrelationFilter();

    private String runAndCaptureMdc(MockHttpServletRequest request, MockHttpServletResponse response) throws Exception {
        AtomicReference<String> seen = new AtomicReference<>();
        filter.doFilter(request, response, new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) {
                seen.set(MDC.get(RequestCorrelationFilter.MDC_KEY));
            }
        });
        return seen.get();
    }

    @Test
    void reusesWellFormedIncomingRequestId() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/lists");
        request.addHeader("X-Request-Id", "fe-1234.abcd_EF");
        MockHttpServletResponse response = new MockHttpServletResponse();

        String inChain = runAndCaptureMdc(request, response);

        assertThat(inChain).isEqualTo("fe-1234.abcd_EF");
        assertThat(response.getHeader("X-Request-Id")).isEqualTo("fe-1234.abcd_EF");
    }

    @Test
    void generatesRequestIdWhenHeaderIsMissing() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        String inChain = runAndCaptureMdc(new MockHttpServletRequest("GET", "/api/lists"), response);

        assertThat(inChain).matches(UUID_PATTERN);
        assertThat(response.getHeader("X-Request-Id")).isEqualTo(inChain);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "has space", "line\nbreak", "{\"json\":1}",
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"})
    void replacesMalformedRequestIdToPreventLogInjection(String header) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/lists");
        request.addHeader("X-Request-Id", header);

        assertThat(runAndCaptureMdc(request, new MockHttpServletResponse())).matches(UUID_PATTERN);
    }

    @Test
    void clearsMdcAfterTheRequest() throws Exception {
        runAndCaptureMdc(new MockHttpServletRequest("GET", "/api/lists"), new MockHttpServletResponse());
        assertThat(MDC.get(RequestCorrelationFilter.MDC_KEY)).isNull();
    }

    @Test
    void clearsMdcAndRethrowsWhenTheChainFails() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/lists");
        MockFilterChain failing = new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res)
                    throws ServletException {
                throw new ServletException("boom");
            }
        };

        assertThatThrownBy(() -> filter.doFilter(request, new MockHttpServletResponse(), failing))
                .isInstanceOf(ServletException.class);
        assertThat(MDC.get(RequestCorrelationFilter.MDC_KEY)).isNull();
    }
}
