package com.example.trelloclone.dto;

import com.example.trelloclone.entity.ListEntity;

public record ListResponse(Long id, String title, Integer sortOrder) {

    public static ListResponse from(ListEntity entity) {
        return new ListResponse(entity.getId(), entity.getTitle(), entity.getSortOrder());
    }
}
