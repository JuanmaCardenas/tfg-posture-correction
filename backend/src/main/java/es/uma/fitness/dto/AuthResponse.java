package es.uma.fitness.dto;

public record AuthResponse(String token, String username, String role) {
}