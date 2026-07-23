package es.uma.fitness.dto;

import java.util.List;

public record ExerciseFiltersResponse(
        List<LabelResponse> muscleGroups,
        List<LabelResponse> difficulties
) {
}