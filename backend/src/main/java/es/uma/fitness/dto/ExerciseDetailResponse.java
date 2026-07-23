package es.uma.fitness.dto;

import java.util.List;

public record ExerciseDetailResponse(
        Long id,
        String name,
        String description,
        List<LabelResponse> muscleGroups,
        LabelResponse difficulty,
        String youtubeVideoId,
        String thumbnailUrl,
        List<String> tips,
        String analysisType,
        double averageRating,
        int ratingCount,
        boolean favorite
) {
}