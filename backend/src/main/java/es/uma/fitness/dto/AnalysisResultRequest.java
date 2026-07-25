package es.uma.fitness.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record AnalysisResultRequest(
        @NotNull Long exerciseId,
        @Min(0) @Max(100) int score
) {
}