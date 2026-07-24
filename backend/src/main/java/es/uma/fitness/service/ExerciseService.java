package es.uma.fitness.service;

import es.uma.fitness.dto.*;
import es.uma.fitness.exception.ExerciseNotFoundException;
import es.uma.fitness.exception.UserNotFoundException;
import es.uma.fitness.mapper.ExerciseMapper;
import es.uma.fitness.model.Difficulty;
import es.uma.fitness.model.Exercise;
import es.uma.fitness.model.MuscleGroup;
import es.uma.fitness.model.User;
import es.uma.fitness.repository.ExerciseRepository;
import es.uma.fitness.repository.FavoriteRepository;
import es.uma.fitness.repository.ReviewRepository;
import es.uma.fitness.repository.UserRepository;
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
    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<ExerciseSummaryResponse> search(String username,
                                                        String search,
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

        return toSummaryPage(page, currentUserId(username));
    }

    @Transactional(readOnly = true)
    public PageResponse<ExerciseSummaryResponse> findFavorites(String username, Pageable pageable) {
        Long userId = currentUserId(username);

        // Sin Sort: el orden por fecha de marcado ya va dentro de la consulta.
        Page<Exercise> page = exerciseRepository.findFavorites(
                userId, PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()));

        return toSummaryPage(page, userId);
    }

    @Transactional(readOnly = true)
    public ExerciseDetailResponse findById(String username, Long id) {
        Exercise exercise = exerciseRepository.findById(id)
                .orElseThrow(() -> new ExerciseNotFoundException(id));

        List<Exercise> single = List.of(exercise);
        Map<Long, ExerciseRatingAggregate> ratings = loadRatings(single);
        Set<Long> favorites = loadFavorites(currentUserId(username), single);

        ExerciseRatingAggregate stats = ratings.get(id);

        return ExerciseMapper.toDetail(
                exercise, average(stats), count(stats), favorites.contains(id));
    }

    public ExerciseFiltersResponse getFilters() {
        return new ExerciseFiltersResponse(
                Arrays.stream(MuscleGroup.values()).map(ExerciseMapper::toLabel).toList(),
                Arrays.stream(Difficulty.values()).map(ExerciseMapper::toLabel).toList()
        );
    }

    // ─────────────── Enriquecido de las tarjetas ───────────────

    /**
     * Convierte una página de ejercicios en una página de tarjetas, resolviendo
     * valoraciones y favoritos con una consulta cada uno para toda la página.
     */
    private PageResponse<ExerciseSummaryResponse> toSummaryPage(Page<Exercise> page, Long userId) {
        Map<Long, ExerciseRatingAggregate> ratings = loadRatings(page.getContent());
        Set<Long> favorites = loadFavorites(userId, page.getContent());

        return PageResponse.from(page.map(exercise -> {
            ExerciseRatingAggregate stats = ratings.get(exercise.getId());
            return ExerciseMapper.toSummary(
                    exercise,
                    average(stats),
                    count(stats),
                    favorites.contains(exercise.getId()));
        }));
    }

    private Map<Long, ExerciseRatingAggregate> loadRatings(List<Exercise> exercises) {
        List<Long> ids = idsOf(exercises);
        if (ids.isEmpty()) {
            return Map.of();   // un IN vacío no es SQL válido
        }
        return reviewRepository.findAggregatesByExerciseIds(ids).stream()
                .collect(Collectors.toMap(ExerciseRatingAggregate::exerciseId, Function.identity()));
    }

    private Set<Long> loadFavorites(Long userId, List<Exercise> exercises) {
        List<Long> ids = idsOf(exercises);
        if (ids.isEmpty()) {
            return Set.of();
        }
        return favoriteRepository.findFavoritedExerciseIds(userId, ids);
    }

    private List<Long> idsOf(List<Exercise> exercises) {
        return exercises.stream().map(Exercise::getId).toList();
    }

    private Long currentUserId(String username) {
        return userRepository.findByUsername(username).map(User::getId).orElseThrow(UserNotFoundException::new);
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
}