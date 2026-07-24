package es.uma.fitness.controller;

import es.uma.fitness.dto.ExerciseDetailResponse;
import es.uma.fitness.dto.ExerciseFiltersResponse;
import es.uma.fitness.dto.ExerciseSummaryResponse;
import es.uma.fitness.dto.PageResponse;
import es.uma.fitness.model.Difficulty;
import es.uma.fitness.model.MuscleGroup;
import es.uma.fitness.service.ExerciseService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Set;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
public class ExerciseController {

    private final ExerciseService exerciseService;

    @GetMapping
    public PageResponse<ExerciseSummaryResponse> list(
            Principal principal,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Set<MuscleGroup> groups,
            @RequestParam(required = false) Difficulty difficulty,
            @PageableDefault(size = 12) Pageable pageable) {

        return exerciseService.search(principal.getName(), search, groups, difficulty, pageable);
    }

    @GetMapping("/{id}")
    public ExerciseDetailResponse detail(Principal principal, @PathVariable Long id) {
        return exerciseService.findById(principal.getName(), id);
    }

    @GetMapping("/filters")
    public ExerciseFiltersResponse filters() {
        return exerciseService.getFilters();
    }
}