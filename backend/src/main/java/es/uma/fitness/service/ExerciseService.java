package es.uma.fitness.service;

import es.uma.fitness.dto.*;
import es.uma.fitness.exception.ExerciseNotFoundException;
import es.uma.fitness.mapper.ExerciseMapper;
import es.uma.fitness.model.Difficulty;
import es.uma.fitness.model.Exercise;
import es.uma.fitness.model.MuscleGroup;
import es.uma.fitness.repository.ExerciseRepository;
import es.uma.fitness.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExerciseService {

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.ASC, "name");

    private final ExerciseRepository exerciseRepository;
    private final ReviewRepository reviewRepository;

    @Transactional(readOnly = true)
    public PageResponse<ExerciseSummaryResponse> search(String search,
                                                        Set<MuscleGroup> groups,
                                                        Difficulty difficulty,
                                                        Pageable pageable) {

        String normalizedSearch = (search == null) ? "" : search.trim();

        Set<MuscleGroup> effectiveGroups = (groups == null || groups.isEmpty())
                ? EnumSet.allOf(MuscleGroup.class)
                : EnumSet.copyOf(groups);

        Set<Difficulty> effectiveDifficulties = (difficulty == null)
                ? EnumSet.allOf(Difficulty.class)
                : EnumSet.of(difficulty);

        Pageable effectivePageable = pageable.getSort().isSorted()
                ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), DEFAULT_SORT);

        Page<Exercise> page = exerciseRepository.search(
                normalizedSearch, effectiveGroups, effectiveDifficulties, effectivePageable);

        Map<Long, ExerciseRatingAggregate> ratings = loadRatings(page.getContent());

        return PageResponse.from(page.map(exercise -> toSummaryWith(exercise, ratings)));
    }

    @Transactional(readOnly = true)
    public ExerciseDetailResponse findById(Long id) {
        Exercise exercise = exerciseRepository.findById(id)
                .orElseThrow(() -> new ExerciseNotFoundException(id));

        ExerciseRatingAggregate stats = loadRatings(List.of(exercise)).get(id);

        return ExerciseMapper.toDetail(
                exercise,
                average(stats),
                count(stats),
                false);   // TODO E3 (RF-07): favoritos en DDUAWFCCP-42
    }

    private ExerciseSummaryResponse toSummaryWith(Exercise exercise,
                                                  Map<Long, ExerciseRatingAggregate> ratings) {
        ExerciseRatingAggregate stats = ratings.get(exercise.getId());
        return ExerciseMapper.toSummary(
                exercise,
                average(stats),
                count(stats),
                false);   // TODO E3 (RF-07): favoritos en DDUAWFCCP-42
    }

    /**
     * Una sola consulta agregada para toda la página de resultados.
     */
    private Map<Long, ExerciseRatingAggregate> loadRatings(List<Exercise> exercises) {
        List<Long> ids = exercises.stream().map(Exercise::getId).toList();
        if (ids.isEmpty()) {
            return Map.of();   // un IN vacío no es SQL válido
        }
        return reviewRepository.findAggregatesByExerciseIds(ids).stream()
                .collect(Collectors.toMap(ExerciseRatingAggregate::exerciseId, Function.identity()));
    }

    /**
     * Un ejercicio sin valoraciones no aparece en el agregado: cuenta como cero.
     */
    private double average(ExerciseRatingAggregate stats) {
        return stats == null ? 0.0 : ReviewService.round(stats.average());
    }

    private int count(ExerciseRatingAggregate stats) {
        return stats == null ? 0 : stats.count().intValue();
    }

    public ExerciseFiltersResponse getFilters() {
        return new ExerciseFiltersResponse(
                Arrays.stream(MuscleGroup.values()).map(ExerciseMapper::toLabel).toList(),
                Arrays.stream(Difficulty.values()).map(ExerciseMapper::toLabel).toList()
        );
    }
}