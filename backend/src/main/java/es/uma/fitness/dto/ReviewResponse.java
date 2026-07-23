package es.uma.fitness.dto;

import java.time.LocalDateTime;

public record ReviewResponse(
        Long id,
        String username,
        int score,
        String content,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}