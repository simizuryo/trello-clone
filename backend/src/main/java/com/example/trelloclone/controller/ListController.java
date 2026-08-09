package com.example.trelloclone.controller;

import com.example.trelloclone.dto.ListCreateRequest;
import com.example.trelloclone.dto.ListResponse;
import com.example.trelloclone.entity.ListEntity;
import com.example.trelloclone.repository.ListRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/lists")
public class ListController {

    private final ListRepository listRepository;

    public ListController(ListRepository listRepository) {
        this.listRepository = listRepository;
    }

    @GetMapping
    public List<ListResponse> getLists() {
        return listRepository.findAllByOrderBySortOrderAsc().stream()
                .map(ListResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public ListResponse getList(@PathVariable Long id) {
        ListEntity entity = listRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "List not found: " + id));
        return ListResponse.from(entity);
    }

    @PostMapping
    public ResponseEntity<ListResponse> createList(@RequestBody ListCreateRequest request) {
        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required");
        }

        ListEntity entity = new ListEntity();
        entity.setTitle(request.title().trim());
        entity.setSortOrder((int) listRepository.count());
        entity.setCreatedAt(LocalDateTime.now());

        ListEntity saved = listRepository.save(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(ListResponse.from(saved));
    }
}
