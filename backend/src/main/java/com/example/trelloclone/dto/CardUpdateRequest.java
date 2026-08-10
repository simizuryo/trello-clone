package com.example.trelloclone.dto;

import java.time.LocalDate;

public record CardUpdateRequest(String title, String priority, LocalDate dueDate) {
}
