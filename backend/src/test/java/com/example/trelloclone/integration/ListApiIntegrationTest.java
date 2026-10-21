package com.example.trelloclone.integration;

import com.example.trelloclone.entity.ListEntity;
import com.example.trelloclone.repository.ListRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * List API end to end through the web layer, JPA and PostgreSQL (Flyway schema).
 * Each test runs in a transaction that is rolled back.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ListApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ListRepository listRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void createdListIsAppendedAndReturnedByGetEndpoints() throws Exception {
        long before = listRepository.count();
        String title = "itest-" + UUID.randomUUID();

        String body = mockMvc.perform(post("/api/lists")
                        .contentType("application/json")
                        .content("{\"title\":\"  " + title + "  \"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value(title))
                .andExpect(jsonPath("$.sortOrder").value((int) before))
                .andReturn().getResponse().getContentAsString();
        long id = objectMapper.readTree(body).get("id").asLong();

        mockMvc.perform(get("/api/lists/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value(title));

        JsonNode all = objectMapper.readTree(mockMvc.perform(get("/api/lists"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        assertThat(all.size()).isEqualTo(before + 1);
        assertThat(all.get(all.size() - 1).get("id").asLong()).isEqualTo(id);

        ListEntity saved = listRepository.findById(id).orElseThrow();
        assertThat(saved.getCreatedAt()).isNotNull();
    }

    @Test
    void listsAreReturnedInSortOrder() throws Exception {
        JsonNode all = objectMapper.readTree(mockMvc.perform(get("/api/lists"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());

        List<Integer> orders = new ArrayList<>();
        all.forEach(n -> orders.add(n.get("sortOrder").asInt()));
        assertThat(orders).isSorted();
    }

    @Test
    void unknownListIsNotFound() throws Exception {
        mockMvc.perform(get("/api/lists/{id}", Long.MAX_VALUE)).andExpect(status().isNotFound());
    }
}
