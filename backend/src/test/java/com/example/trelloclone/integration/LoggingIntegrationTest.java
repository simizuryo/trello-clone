package com.example.trelloclone.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Predicate;

import static net.logstash.logback.argument.StructuredArguments.kv;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies the real logback-spring.xml wiring: JSON lines on stdout carrying level,
 * timestamp, correlation ID and structured fields, with sensitive values masked.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ExtendWith(OutputCaptureExtension.class)
class LoggingIntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(LoggingIntegrationTest.class);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private List<JsonNode> jsonLines(CapturedOutput output) {
        List<JsonNode> result = new ArrayList<>();
        for (String line : output.getOut().split("\\R")) {
            if (line.startsWith("{")) {
                try {
                    result.add(objectMapper.readTree(line));
                } catch (Exception e) {
                    throw new AssertionError("Log line is not valid JSON: " + line, e);
                }
            }
        }
        return result;
    }

    private JsonNode find(CapturedOutput output, Predicate<JsonNode> predicate) {
        return jsonLines(output).stream().filter(predicate).findFirst()
                .orElseThrow(() -> new AssertionError("No matching log line in:\n" + output.getOut()));
    }

    @Test
    void accessLogIsJsonWithCorrelationIdAndRequestFields(CapturedOutput output) throws Exception {
        mockMvc.perform(get("/api/lists").header("X-Request-Id", "itest-corr-1"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Request-Id", "itest-corr-1"));

        JsonNode access = find(output, n -> "itest-corr-1".equals(n.path("requestId").asText())
                && n.path("logger_name").asText().endsWith("RequestCorrelationFilter"));

        assertThat(access.path("level").asText()).isEqualTo("INFO");
        assertThat(access.path("timestamp").asText()).matches("\\d{4}-\\d{2}-\\d{2}T.*");
        assertThat(access.path("method").asText()).isEqualTo("GET");
        assertThat(access.path("path").asText()).isEqualTo("/api/lists");
        assertThat(access.path("status").asInt()).isEqualTo(200);
        assertThat(access.has("durationMs")).isTrue();
        assertThat(access.path("app").asText()).isEqualTo("trello-clone-backend");
    }

    @Test
    void everyLogLineOfARequestSharesItsCorrelationId(CapturedOutput output) throws Exception {
        mockMvc.perform(post("/api/lists").header("X-Request-Id", "itest-corr-2")
                        .contentType("application/json").content("{\"title\":\"itest corr list\"}"))
                .andExpect(status().isCreated());

        List<String> loggers = jsonLines(output).stream()
                .filter(n -> "itest-corr-2".equals(n.path("requestId").asText()))
                .map(n -> n.path("logger_name").asText())
                .toList();
        assertThat(loggers).contains(
                "com.example.trelloclone.controller.ListController",
                "com.example.trelloclone.logging.RequestCorrelationFilter");

        JsonNode created = find(output, n -> n.path("message").asText().startsWith("List created"));
        assertThat(created.path("listId").isNumber()).isTrue();
    }

    @Test
    void generatesCorrelationIdWhenClientSendsNone(CapturedOutput output) throws Exception {
        String id = mockMvc.perform(get("/api/lists"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getHeader("X-Request-Id");

        assertThat(id).isNotBlank();
        find(output, n -> id.equals(n.path("requestId").asText()));
    }

    @Test
    void clientErrorsAreLoggedWithTheirStatus(CapturedOutput output) throws Exception {
        mockMvc.perform(post("/api/cards").header("X-Request-Id", "itest-corr-400")
                        .contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());

        JsonNode access = find(output, n -> "itest-corr-400".equals(n.path("requestId").asText())
                && n.has("status"));
        assertThat(access.path("status").asInt()).isEqualTo(400);
    }

    @Test
    void sensitiveValuesAreMaskedInMessageAndFields(CapturedOutput output) {
        log.warn("itest-mask login failed password=hunter2 for alice@example.com {}",
                kv("token", "tok-123"), kv("note", "Authorization: Bearer abc.def"));

        JsonNode line = find(output, n -> n.path("message").asText().startsWith("itest-mask"));
        assertThat(line.path("level").asText()).isEqualTo("WARN");
        assertThat(line.path("message").asText())
                .doesNotContain("hunter2", "alice@")
                .contains("password=****", "****@example.com");
        assertThat(line.path("token").asText()).isEqualTo("****");
        assertThat(line.path("note").asText()).isEqualTo("Authorization: **** ****");
        assertThat(output.getOut()).doesNotContain("hunter2", "tok-123", "abc.def");
    }
}
