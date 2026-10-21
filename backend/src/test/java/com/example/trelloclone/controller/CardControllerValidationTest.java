package com.example.trelloclone.controller;

import com.example.trelloclone.entity.ListEntity;
import com.example.trelloclone.repository.CardRepository;
import com.example.trelloclone.repository.ListRepository;
import com.example.trelloclone.service.CardService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer unit tests for request validation. Repositories and services are mocked,
 * so no database is needed.
 */
@WebMvcTest({CardController.class, ListController.class})
class CardControllerValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CardRepository cardRepository;

    @MockBean
    private ListRepository listRepository;

    @MockBean
    private CardService cardService;

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"listId\":1}", "{\"listId\":1,\"title\":\"   \"}"})
    void createCardRequiresTitle(String body) throws Exception {
        mockMvc.perform(post("/api/cards").contentType("application/json").content(body))
                .andExpect(status().isBadRequest());
        verify(cardRepository, never()).save(any());
    }

    @Test
    void createCardRequiresListId() throws Exception {
        mockMvc.perform(post("/api/cards").contentType("application/json").content("{\"title\":\"t\"}"))
                .andExpect(status().isBadRequest());
        verify(cardRepository, never()).save(any());
    }

    @Test
    void createCardRejectsUnknownList() throws Exception {
        when(listRepository.findById(5L)).thenReturn(Optional.empty());
        mockMvc.perform(post("/api/cards").contentType("application/json").content("{\"listId\":5,\"title\":\"t\"}"))
                .andExpect(status().isBadRequest());
        verify(cardRepository, never()).save(any());
    }

    @Test
    void createCardRejectsInvalidPriority() throws Exception {
        when(listRepository.findById(1L)).thenReturn(Optional.of(new ListEntity()));
        mockMvc.perform(post("/api/cards").contentType("application/json")
                        .content("{\"listId\":1,\"title\":\"t\",\"priority\":\"URGENT\"}"))
                .andExpect(status().isBadRequest());
        verify(cardRepository, never()).save(any());
    }

    @Test
    void searchRejectsInvalidPriorityParameter() throws Exception {
        mockMvc.perform(get("/api/cards").param("priority", "URGENT"))
                .andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"listId\":1}", "{\"sortOrder\":0}"})
    void moveCardRequiresListIdAndSortOrder(String body) throws Exception {
        mockMvc.perform(patch("/api/cards/1/position").contentType("application/json").content(body))
                .andExpect(status().isBadRequest());
        verify(cardService, never()).moveCard(anyLong(), anyLong(), anyInt());
    }

    @Test
    void getUnknownCardIsNotFound() throws Exception {
        when(cardRepository.findById(1L)).thenReturn(Optional.empty());
        mockMvc.perform(get("/api/cards/1")).andExpect(status().isNotFound());
    }

    @Test
    void getUnknownListIsNotFound() throws Exception {
        when(listRepository.findById(1L)).thenReturn(Optional.empty());
        mockMvc.perform(get("/api/lists/1")).andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"title\":\"\"}", "{\"title\":\"  \"}"})
    void createListRequiresTitle(String body) throws Exception {
        mockMvc.perform(post("/api/lists").contentType("application/json").content(body))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(listRepository);
    }
}
