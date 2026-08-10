package com.example.trelloclone.controller;

import com.example.trelloclone.entity.CardEntity;
import com.example.trelloclone.entity.ListEntity;
import com.example.trelloclone.entity.Priority;
import com.example.trelloclone.repository.CardRepository;
import com.example.trelloclone.repository.ListRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CardUpdateTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CardRepository cardRepository;

    @Autowired
    private ListRepository listRepository;

    private ListEntity listA;
    private ListEntity listB;
    private CardEntity a0;
    private CardEntity a1;
    private CardEntity a2;
    private CardEntity b0;

    @BeforeEach
    void setUp() {
        listA = new ListEntity();
        listA.setTitle("Test List A");
        listA.setSortOrder(100);
        listA.setCreatedAt(LocalDateTime.now());
        listA = listRepository.save(listA);

        listB = new ListEntity();
        listB.setTitle("Test List B (完了)");
        listB.setSortOrder(101);
        listB.setCreatedAt(LocalDateTime.now());
        listB = listRepository.save(listB);

        a0 = newCard(listA, "A0", 0, Priority.LOW);
        a1 = newCard(listA, "A1", 1, Priority.MEDIUM);
        a2 = newCard(listA, "A2", 2, Priority.HIGH);
        b0 = newCard(listB, "B0", 0, null);
    }

    private CardEntity newCard(ListEntity list, String title, int sortOrder, Priority priority) {
        CardEntity c = new CardEntity();
        c.setList(list);
        c.setTitle(title);
        c.setSortOrder(sortOrder);
        c.setPriority(priority);
        c.setCreatedAt(LocalDateTime.now());
        return cardRepository.save(c);
    }

    @Test
    void updatesTitlePriorityAndDueDate() throws Exception {
        mockMvc.perform(patch("/api/cards/{id}", a0.getId())
                        .contentType("application/json")
                        .content("{\"title\":\"A0 updated\",\"priority\":\"HIGH\",\"dueDate\":\"2026-09-01\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("A0 updated"))
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.dueDate").value("2026-09-01"));

        CardEntity reloaded = cardRepository.findById(a0.getId()).orElseThrow();
        assertThat(reloaded.getTitle()).isEqualTo("A0 updated");
        assertThat(reloaded.getPriority()).isEqualTo(Priority.HIGH);
        assertThat(reloaded.getDueDate().toString()).isEqualTo("2026-09-01");
    }

    @Test
    void clearsPriorityAndDueDateWhenNull() throws Exception {
        mockMvc.perform(patch("/api/cards/{id}", a2.getId())
                        .contentType("application/json")
                        .content("{\"title\":\"A2\",\"priority\":null,\"dueDate\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priority").doesNotExist())
                .andExpect(jsonPath("$.dueDate").doesNotExist());

        CardEntity reloaded = cardRepository.findById(a2.getId()).orElseThrow();
        assertThat(reloaded.getPriority()).isNull();
        assertThat(reloaded.getDueDate()).isNull();
    }

    @Test
    void rejectsBlankTitle() throws Exception {
        mockMvc.perform(patch("/api/cards/{id}", a0.getId())
                        .contentType("application/json")
                        .content("{\"title\":\"  \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reordersWithinSameList() throws Exception {
        // Move A2 (index 2) to index 0 within list A -> expect order [A2, A0, A1]
        mockMvc.perform(patch("/api/cards/{id}/position", a2.getId())
                        .contentType("application/json")
                        .content("{\"listId\":" + listA.getId() + ",\"sortOrder\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sortOrder").value(0));

        List<CardEntity> siblings = cardRepository.findByList_IdOrderBySortOrderAsc(listA.getId());
        assertThat(siblings).extracting(CardEntity::getTitle).containsExactly("A2", "A0", "A1");
        assertThat(siblings).extracting(CardEntity::getSortOrder).containsExactly(0, 1, 2);
    }

    @Test
    void movesAcrossListsAndReindexesBoth() throws Exception {
        // Move A1 (list A, index 1) into list B ("完了" list) at index 1 (after B0)
        mockMvc.perform(patch("/api/cards/{id}/position", a1.getId())
                        .contentType("application/json")
                        .content("{\"listId\":" + listB.getId() + ",\"sortOrder\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.listId").value(listB.getId()))
                .andExpect(jsonPath("$.sortOrder").value(1));

        List<CardEntity> remainingA = cardRepository.findByList_IdOrderBySortOrderAsc(listA.getId());
        assertThat(remainingA).extracting(CardEntity::getTitle).containsExactly("A0", "A2");
        assertThat(remainingA).extracting(CardEntity::getSortOrder).containsExactly(0, 1);

        List<CardEntity> nowB = cardRepository.findByList_IdOrderBySortOrderAsc(listB.getId());
        assertThat(nowB).extracting(CardEntity::getTitle).containsExactly("B0", "A1");
        assertThat(nowB).extracting(CardEntity::getSortOrder).containsExactly(0, 1);
    }

    @Test
    void movingToUnknownListReturnsBadRequest() throws Exception {
        mockMvc.perform(patch("/api/cards/{id}/position", a0.getId())
                        .contentType("application/json")
                        .content("{\"listId\":999999,\"sortOrder\":0}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updatingUnknownCardReturnsNotFound() throws Exception {
        mockMvc.perform(patch("/api/cards/{id}", 999999)
                        .contentType("application/json")
                        .content("{\"title\":\"x\"}"))
                .andExpect(status().isNotFound());
    }
}
