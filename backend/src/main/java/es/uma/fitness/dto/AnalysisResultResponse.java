package es.uma.fitness.dto;

import java.time.LocalDateTime;

public record AnalysisResultResponse(
        Long id,
        Long exerciseId,
        String exerciseName,
        String analysisType,
        int score,
        LocalDateTime createdAt
) {
}