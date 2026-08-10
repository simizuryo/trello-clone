package com.example.trelloclone.service;

import com.example.trelloclone.dto.CardResponse;
import com.example.trelloclone.entity.CardEntity;
import com.example.trelloclone.entity.ListEntity;
import com.example.trelloclone.repository.CardRepository;
import com.example.trelloclone.repository.ListRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class CardService {

    private final CardRepository cardRepository;
    private final ListRepository listRepository;

    public CardService(CardRepository cardRepository, ListRepository listRepository) {
        this.cardRepository = cardRepository;
        this.listRepository = listRepository;
    }

    @Transactional
    public CardResponse moveCard(Long cardId, Long targetListId, int targetIndex) {
        CardEntity card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Card not found: " + cardId));
        ListEntity targetList = listRepository.findById(targetListId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "List not found: " + targetListId));

        Long sourceListId = card.getList().getId();

        if (sourceListId.equals(targetListId)) {
            List<CardEntity> siblings = cardRepository.findByList_IdOrderBySortOrderAsc(targetListId);
            siblings.removeIf(c -> c.getId().equals(cardId));
            siblings.add(clamp(targetIndex, siblings.size()), card);
            reindex(siblings);
            cardRepository.saveAll(siblings);
        } else {
            List<CardEntity> sourceSiblings = cardRepository.findByList_IdOrderBySortOrderAsc(sourceListId);
            sourceSiblings.removeIf(c -> c.getId().equals(cardId));
            reindex(sourceSiblings);

            List<CardEntity> targetSiblings = cardRepository.findByList_IdOrderBySortOrderAsc(targetListId);
            card.setList(targetList);
            targetSiblings.add(clamp(targetIndex, targetSiblings.size()), card);
            reindex(targetSiblings);

            cardRepository.saveAll(sourceSiblings);
            cardRepository.saveAll(targetSiblings);
        }

        return CardResponse.from(card);
    }

    private int clamp(int index, int size) {
        return Math.max(0, Math.min(index, size));
    }

    private void reindex(List<CardEntity> cards) {
        for (int i = 0; i < cards.size(); i++) {
            cards.get(i).setSortOrder(i);
        }
    }
}
