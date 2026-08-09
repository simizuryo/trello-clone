package com.example.trelloclone.dto;

import java.time.LocalDate;

public record CardCreateRequest(Long listId, String title, String priority, LocalDate dueDate) {
}
