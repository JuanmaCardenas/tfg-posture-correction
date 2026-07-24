package es.uma.fitness.controller;

import es.uma.fitness.dto.ExerciseSummaryResponse;
import es.uma.fitness.dto.PageResponse;
import es.uma.fitness.service.ExerciseService;
import es.uma.fitness.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;
    private final ExerciseService exerciseService;

    @PutMapping("/exercises/{exerciseId}/favorite")
    public ResponseEntity<Void> add(Principal principal, @PathVariable Long exerciseId) {
        favoriteService.add(principal.getName(), exerciseId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/exercises/{exerciseId}/favorite")
    public ResponseEntity<Void> remove(Principal principal, @PathVariable Long exerciseId) {
        favoriteService.remove(principal.getName(), exerciseId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/favorites")
    public PageResponse<ExerciseSummaryResponse> list(Principal principal,
                                                      @PageableDefault(size = 12) Pageable pageable) {
        return exerciseService.findFavorites(principal.getName(), pageable);
    }
}