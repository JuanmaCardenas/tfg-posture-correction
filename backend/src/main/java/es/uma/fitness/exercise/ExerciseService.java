package es.uma.fitness.exercise;

import es.uma.fitness.exercise.dto.ExerciseDetailResponse;
import es.uma.fitness.exercise.dto.ExerciseSummaryResponse;
import es.uma.fitness.exercise.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ExerciseService {

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.ASC, "name");

    private final ExerciseRepository exerciseRepository;

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

        return PageResponse.from(page.map(ExerciseMapper::toSummary));
    }

    @Transactional(readOnly = true)
    public ExerciseDetailResponse findById(Long id) {
        Exercise exercise = exerciseRepository.findById(id)
                .orElseThrow(() -> new ExerciseNotFoundException(id));
        return ExerciseMapper.toDetail(exercise);
    }
}