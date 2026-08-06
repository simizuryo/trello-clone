package com.example.trelloclone.dto;

import com.example.trelloclone.entity.CardEntity;

import java.time.LocalDate;

public record CardResponse(
        Long id,
        Long listId,
        String title,
        Integer sortOrder,
        String priority,
        LocalDate dueDate
) {

    public static CardResponse from(CardEntity entity) {
        return new CardResponse(
                entity.getId(),
                entity.getList().getId(),
                entity.getTitle(),
                entity.getSortOrder(),
                entity.getPriority() == null ? null : entity.getPriority().name(),
                entity.getDueDate()
        );
    }
}
