package com.example.trelloclone.controller;

import com.example.trelloclone.dto.CardCreateRequest;
import com.example.trelloclone.dto.CardResponse;
import com.example.trelloclone.entity.CardEntity;
import com.example.trelloclone.entity.ListEntity;
import com.example.trelloclone.entity.Priority;
import com.example.trelloclone.repository.CardRepository;
import com.example.trelloclone.repository.CardSpecifications;
import com.example.trelloclone.repository.ListRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/cards")
public class CardController {

    private final CardRepository cardRepository;
    private final ListRepository listRepository;

    public CardController(CardRepository cardRepository, ListRepository listRepository) {
        this.cardRepository = cardRepository;
        this.listRepository = listRepository;
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

    @PostMapping
    public ResponseEntity<CardResponse> createCard(@RequestBody CardCreateRequest request) {
        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required");
        }
        if (request.listId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "listId is required");
        }

        ListEntity list = listRepository.findById(request.listId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "List not found: " + request.listId()));

        Priority priority = null;
        if (request.priority() != null && !request.priority().isBlank()) {
            try {
                priority = Priority.valueOf(request.priority());
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid priority: " + request.priority());
            }
        }

        CardEntity entity = new CardEntity();
        entity.setList(list);
        entity.setTitle(request.title().trim());
        entity.setSortOrder((int) cardRepository.countByList_Id(request.listId()));
        entity.setPriority(priority);
        entity.setDueDate(request.dueDate());
        entity.setCreatedAt(LocalDateTime.now());

        CardEntity saved = cardRepository.save(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(CardResponse.from(saved));
    }
}
