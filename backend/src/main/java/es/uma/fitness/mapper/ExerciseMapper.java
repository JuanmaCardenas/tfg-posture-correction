package es.uma.fitness.mapper;

import es.uma.fitness.dto.ExerciseDetailResponse;
import es.uma.fitness.dto.ExerciseSummaryResponse;
import es.uma.fitness.dto.LabelResponse;
import es.uma.fitness.model.Difficulty;
import es.uma.fitness.model.Exercise;
import es.uma.fitness.model.MuscleGroup;

import java.util.Comparator;
import java.util.List;

public final class ExerciseMapper {

    private static final String THUMBNAIL_PATTERN = "https://img.youtube.com/vi/%s/mqdefault.jpg";

    private ExerciseMapper() {
    }

    public static ExerciseSummaryResponse toSummary(Exercise exercise) {
        return new ExerciseSummaryResponse(
                exercise.getId(),
                exercise.getName(),
                toMuscleGroupList(exercise),
                toLabel(exercise.getDifficulty()),
                thumbnailUrl(exercise.getYoutubeVideoId()),
                0.0,    // TODO E3 (RF-05)
                0,      // TODO E3 (RF-05)
                false   // TODO E3 (RF-07)
        );
    }

    public static ExerciseDetailResponse toDetail(Exercise exercise) {
        return new ExerciseDetailResponse(
                exercise.getId(),
                exercise.getName(),
                exercise.getDescription(),
                toMuscleGroupList(exercise),
                toLabel(exercise.getDifficulty()),
                exercise.getYoutubeVideoId(),
                thumbnailUrl(exercise.getYoutubeVideoId()),
                List.copyOf(exercise.getTips()),
                exercise.getAnalysisType() == null ? null : exercise.getAnalysisType().name(),
                0.0,    // TODO E3 (RF-05)
                0,      // TODO E3 (RF-05)
                false   // TODO E3 (RF-07)
        );
    }

    private static List<LabelResponse> toMuscleGroupList(Exercise exercise) {
        return exercise.getMuscleGroups().stream()
                .sorted(Comparator.comparing(MuscleGroup::name))
                .map(ExerciseMapper::toLabel)
                .toList();
    }

    public static LabelResponse toLabel(MuscleGroup group) {
        return new LabelResponse(group.name(), group.getLabel());
    }

    public static LabelResponse toLabel(Difficulty difficulty) {
        return new LabelResponse(difficulty.name(), difficulty.getLabel());
    }

    private static String thumbnailUrl(String youtubeVideoId) {
        return THUMBNAIL_PATTERN.formatted(youtubeVideoId);
    }
}