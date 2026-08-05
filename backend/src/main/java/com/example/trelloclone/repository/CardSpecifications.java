package com.example.trelloclone.repository;

import com.example.trelloclone.entity.CardEntity;
import com.example.trelloclone.entity.Priority;
import org.springframework.data.jpa.domain.Specification;

public final class CardSpecifications {

    private CardSpecifications() {
    }

    public static Specification<CardEntity> hasListId(Long listId) {
        return (root, query, cb) -> listId == null ? null : cb.equal(root.get("list").get("id"), listId);
    }

    public static Specification<CardEntity> hasPriority(Priority priority) {
        return (root, query, cb) -> priority == null ? null : cb.equal(root.get("priority"), priority);
    }

    public static Specification<CardEntity> titleContains(String keyword) {
        return (root, query, cb) -> (keyword == null || keyword.isBlank())
                ? null
                : cb.like(cb.lower(root.get("title")), "%" + keyword.toLowerCase() + "%");
    }
}
