package es.uma.fitness.dto;

import es.uma.fitness.model.Role;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String username,
        String email,
        Role role,
        LocalDateTime createdAt
) {
}