package es.uma.fitness.mapper;

import es.uma.fitness.dto.AnalysisResultResponse;
import es.uma.fitness.model.AnalysisResult;

public final class AnalysisResultMapper {

    private AnalysisResultMapper() {
    }

    public static AnalysisResultResponse toResponse(AnalysisResult result) {
        var exercise = result.getExercise();
        return new AnalysisResultResponse(
                result.getId(),
                exercise.getId(),
                exercise.getName(),
                exercise.getAnalysisType() == null ? null : exercise.getAnalysisType().name(),
                result.getScore(),
                result.getCreatedAt()
        );
    }
}