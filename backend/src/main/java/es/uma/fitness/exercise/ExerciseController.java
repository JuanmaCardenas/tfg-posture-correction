package es.uma.fitness.exercise;

import es.uma.fitness.exercise.dto.ExerciseDetailResponse;
import es.uma.fitness.exercise.dto.ExerciseSummaryResponse;
import es.uma.fitness.exercise.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
public class ExerciseController {

    private final ExerciseService exerciseService;

    @GetMapping
    public PageResponse<ExerciseSummaryResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Set<MuscleGroup> groups,
            @RequestParam(required = false) Difficulty difficulty,
            @PageableDefault(size = 12) Pageable pageable) {

        return exerciseService.search(search, groups, difficulty, pageable);
    }

    @GetMapping("/{id}")
    public ExerciseDetailResponse detail(@PathVariable Long id) {
        return exerciseService.findById(id);
    }
}