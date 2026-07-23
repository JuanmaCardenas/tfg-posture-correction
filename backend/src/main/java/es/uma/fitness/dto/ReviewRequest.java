package es.uma.fitness.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewRequest(

        @NotNull(message = "La puntuación es obligatoria")
        @Min(value = 1, message = "La puntuación mínima es 1 estrella")
        @Max(value = 5, message = "La puntuación máxima es 5 estrellas")
        Integer score,

        @Size(max = 500, message = "El comentario no puede superar los 500 caracteres")
        String content
) {
}