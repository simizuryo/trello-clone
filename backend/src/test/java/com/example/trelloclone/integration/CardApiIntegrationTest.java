package com.example.trelloclone.integration;

import com.example.trelloclone.entity.CardEntity;
import com.example.trelloclone.entity.ListEntity;
import com.example.trelloclone.entity.Priority;
import com.example.trelloclone.repository.CardRepository;
import com.example.trelloclone.repository.ListRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Card API end to end through the web layer, JPA specifications and PostgreSQL.
 * Test data uses a unique keyword prefix so assertions don't depend on seed data.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CardApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private ListRepository listRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String prefix;
    private ListEntity todo;
    private ListEntity done;

    @BeforeEach
    void setUp() {
        prefix = "itest" + UUID.randomUUID().toString().substring(0, 8);
        todo = newList(prefix + " todo", 900);
        done = newList(prefix + " done", 901);

        newCard(todo, prefix + " Write Spec", 0, Priority.HIGH, LocalDate.of(2026, 9, 1));
        newCard(todo, prefix + " review spec", 1, Priority.LOW, null);
        newCard(todo, prefix + " deploy", 2, null, null);
        newCard(done, prefix + " SPEC kickoff", 0, Priority.HIGH, null);
    }

    private ListEntity newList(String title, int sortOrder) {
        ListEntity l = new ListEntity();
        l.setTitle(title);
        l.setSortOrder(sortOrder);
        l.setCreatedAt(LocalDateTime.now());
        return listRepository.save(l);
    }

    private void newCard(ListEntity list, String title, int sortOrder, Priority priority, LocalDate dueDate) {
        CardEntity c = new CardEntity();
        c.setList(list);
        c.setTitle(title);
        c.setSortOrder(sortOrder);
        c.setPriority(priority);
        c.setDueDate(dueDate);
        c.setCreatedAt(LocalDateTime.now());
        cardRepository.save(c);
    }

    private List<String> titles(MockHttpServletRequestBuilder request) throws Exception {
        JsonNode json = objectMapper.readTree(mockMvc.perform(request)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        List<String> result = new ArrayList<>();
        json.forEach(n -> result.add(n.get("title").asText().substring(prefix.length() + 1)));
        return result;
    }

    @Test
    void keywordSearchIsCaseInsensitiveAndOrderedByListThenSortOrder() throws Exception {
        assertThat(titles(get("/api/cards").param("keyword", "sPeC").param("listId", String.valueOf(todo.getId()))))
                .containsExactly("Write Spec", "review spec");
        assertThat(titles(get("/api/cards").param("keyword", prefix + " spec")))
                .containsExactly("SPEC kickoff");
        assertThat(titles(get("/api/cards").param("keyword", prefix)))
                .containsExactly("Write Spec", "review spec", "deploy", "SPEC kickoff");
    }

    @Test
    void filtersCombineWithAnd() throws Exception {
        assertThat(titles(get("/api/cards").param("keyword", prefix).param("priority", "HIGH")))
                .containsExactly("Write Spec", "SPEC kickoff");
        assertThat(titles(get("/api/cards").param("keyword", prefix).param("priority", "HIGH")
                .param("listId", String.valueOf(done.getId()))))
                .containsExactly("SPEC kickoff");
        assertThat(titles(get("/api/cards").param("listId", String.valueOf(todo.getId()))))
                .containsExactly("Write Spec", "review spec", "deploy");
    }

    @Test
    void searchReturnsAllResponseFields() throws Exception {
        mockMvc.perform(get("/api/cards").param("keyword", prefix + " write"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").isNumber())
                .andExpect(jsonPath("$[0].listId").value(todo.getId()))
                .andExpect(jsonPath("$[0].sortOrder").value(0))
                .andExpect(jsonPath("$[0].priority").value("HIGH"))
                .andExpect(jsonPath("$[0].dueDate").value("2026-09-01"));
    }

    @Test
    void createdCardIsAppendedToTheEndOfItsList() throws Exception {
        String body = mockMvc.perform(post("/api/cards")
                        .contentType("application/json")
                        .content("{\"listId\":" + done.getId() + ",\"title\":\"  " + prefix
                                + " new  \",\"priority\":\"MEDIUM\",\"dueDate\":\"2026-10-31\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value(prefix + " new"))
                .andExpect(jsonPath("$.listId").value(done.getId()))
                .andExpect(jsonPath("$.sortOrder").value(1))
                .andExpect(jsonPath("$.priority").value("MEDIUM"))
                .andExpect(jsonPath("$.dueDate").value("2026-10-31"))
                .andReturn().getResponse().getContentAsString();
        long id = objectMapper.readTree(body).get("id").asLong();

        mockMvc.perform(get("/api/cards/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value(prefix + " new"));
        assertThat(titles(get("/api/cards").param("listId", String.valueOf(done.getId()))))
                .containsExactly("SPEC kickoff", "new");
    }

    @Test
    void createThenMoveThenUpdateKeepsBothListsConsistent() throws Exception {
        String body = mockMvc.perform(post("/api/cards")
                        .contentType("application/json")
                        .content("{\"listId\":" + todo.getId() + ",\"title\":\"" + prefix + " flow\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long id = objectMapper.readTree(body).get("id").asLong();

        mockMvc.perform(patch("/api/cards/{id}/position", id)
                        .contentType("application/json")
                        .content("{\"listId\":" + done.getId() + ",\"sortOrder\":0}"))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/api/cards/{id}", id)
                        .contentType("application/json")
                        .content("{\"title\":\"" + prefix + " flow done\",\"priority\":\"LOW\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.listId").value(done.getId()))
                .andExpect(jsonPath("$.sortOrder").value(0));

        assertThat(titles(get("/api/cards").param("listId", String.valueOf(done.getId()))))
                .containsExactly("flow done", "SPEC kickoff");
        assertThat(titles(get("/api/cards").param("listId", String.valueOf(todo.getId()))))
                .containsExactly("Write Spec", "review spec", "deploy");
    }
}
