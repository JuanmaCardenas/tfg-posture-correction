package es.uma.fitness.exercise.dto;

import java.util.List;

public record ExerciseSummaryResponse(
        Long id,
        String name,
        List<LabelResponse> muscleGroups,
        LabelResponse difficulty,
        String thumbnailUrl,
        double averageRating,
        int ratingCount,
        boolean favorite
) {
}