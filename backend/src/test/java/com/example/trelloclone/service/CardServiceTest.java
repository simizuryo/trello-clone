package com.example.trelloclone.service;

import com.example.trelloclone.dto.CardResponse;
import com.example.trelloclone.entity.CardEntity;
import com.example.trelloclone.entity.ListEntity;
import com.example.trelloclone.repository.CardRepository;
import com.example.trelloclone.repository.ListRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CardServiceTest {

    @Mock
    private CardRepository cardRepository;

    @Mock
    private ListRepository listRepository;

    @InjectMocks
    private CardService cardService;

    private ListEntity listA;
    private ListEntity listB;
    private CardEntity a0;
    private CardEntity a1;
    private CardEntity a2;
    private CardEntity b0;

    @BeforeEach
    void setUp() {
        listA = list(1L);
        listB = list(2L);
        a0 = card(10L, listA, 0);
        a1 = card(11L, listA, 1);
        a2 = card(12L, listA, 2);
        b0 = card(20L, listB, 0);
    }

    private static ListEntity list(Long id) {
        ListEntity l = new ListEntity();
        l.setId(id);
        return l;
    }

    private static CardEntity card(Long id, ListEntity list, int sortOrder) {
        CardEntity c = new CardEntity();
        c.setId(id);
        c.setList(list);
        c.setTitle("card-" + id);
        c.setSortOrder(sortOrder);
        return c;
    }

    @Test
    void reordersWithinSameListAndReindexes() {
        when(cardRepository.findById(12L)).thenReturn(Optional.of(a2));
        when(listRepository.findById(1L)).thenReturn(Optional.of(listA));
        when(cardRepository.findByList_IdOrderBySortOrderAsc(1L)).thenReturn(new ArrayList<>(List.of(a0, a1, a2)));

        CardResponse result = cardService.moveCard(12L, 1L, 0);

        assertThat(result.sortOrder()).isZero();
        assertThat(List.of(a2, a0, a1)).extracting(CardEntity::getSortOrder).containsExactly(0, 1, 2);
        verify(cardRepository).saveAll(List.of(a2, a0, a1));
    }

    @Test
    void movesAcrossListsAndReindexesBothLists() {
        when(cardRepository.findById(11L)).thenReturn(Optional.of(a1));
        when(listRepository.findById(2L)).thenReturn(Optional.of(listB));
        when(cardRepository.findByList_IdOrderBySortOrderAsc(1L)).thenReturn(new ArrayList<>(List.of(a0, a1, a2)));
        when(cardRepository.findByList_IdOrderBySortOrderAsc(2L)).thenReturn(new ArrayList<>(List.of(b0)));

        CardResponse result = cardService.moveCard(11L, 2L, 0);

        assertThat(result.listId()).isEqualTo(2L);
        assertThat(a1.getList()).isSameAs(listB);
        assertThat(List.of(a1, b0)).extracting(CardEntity::getSortOrder).containsExactly(0, 1);
        assertThat(List.of(a0, a2)).extracting(CardEntity::getSortOrder).containsExactly(0, 1);
        verify(cardRepository).saveAll(List.of(a0, a2));
        verify(cardRepository).saveAll(List.of(a1, b0));
    }

    @Test
    void clampsTargetIndexToListBounds() {
        when(cardRepository.findById(10L)).thenReturn(Optional.of(a0));
        when(listRepository.findById(2L)).thenReturn(Optional.of(listB));
        when(cardRepository.findByList_IdOrderBySortOrderAsc(1L)).thenReturn(new ArrayList<>(List.of(a0, a1, a2)));
        when(cardRepository.findByList_IdOrderBySortOrderAsc(2L)).thenReturn(new ArrayList<>(List.of(b0)));

        CardResponse result = cardService.moveCard(10L, 2L, 99);

        assertThat(result.sortOrder()).isEqualTo(1);
    }

    @Test
    void clampsNegativeTargetIndexToZero() {
        when(cardRepository.findById(12L)).thenReturn(Optional.of(a2));
        when(listRepository.findById(1L)).thenReturn(Optional.of(listA));
        when(cardRepository.findByList_IdOrderBySortOrderAsc(1L)).thenReturn(new ArrayList<>(List.of(a0, a1, a2)));

        assertThat(cardService.moveCard(12L, 1L, -3).sortOrder()).isZero();
    }

    @Test
    void unknownCardIsNotFound() {
        when(cardRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cardService.moveCard(99L, 1L, 0))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(cardRepository, never()).saveAll(any());
    }

    @Test
    void unknownTargetListIsBadRequest() {
        when(cardRepository.findById(10L)).thenReturn(Optional.of(a0));
        when(listRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cardService.moveCard(10L, 99L, 0))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
        verify(cardRepository, never()).saveAll(any());
    }
}
