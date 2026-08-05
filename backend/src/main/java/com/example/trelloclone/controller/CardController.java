package com.example.trelloclone.controller;

import com.example.trelloclone.dto.CardResponse;
import com.example.trelloclone.entity.CardEntity;
import com.example.trelloclone.entity.Priority;
import com.example.trelloclone.repository.CardRepository;
import com.example.trelloclone.repository.CardSpecifications;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/cards")
public class CardController {

    private final CardRepository cardRepository;

    public CardController(CardRepository cardRepository) {
        this.cardRepository = cardRepository;
    }

    @GetMapping
    public List<CardResponse> searchCards(
            @RequestParam(required = false) Long listId,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) String keyword
    ) {
        Specification<CardEntity> spec = Specification.allOf(
                CardSpecifications.hasListId(listId),
                CardSpecifications.hasPriority(priority),
                CardSpecifications.titleContains(keyword)
        );

        Sort sort = Sort.by("list.id").ascending().and(Sort.by("sortOrder").ascending());
        return cardRepository.findAll(spec, sort).stream()
                .map(CardResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public CardResponse getCard(@PathVariable Long id) {
        CardEntity entity = cardRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Card not found: " + id));
        return CardResponse.from(entity);
    }
}
