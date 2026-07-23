package es.uma.fitness.controller;

import es.uma.fitness.dto.ReviewRequest;
import es.uma.fitness.dto.ReviewResponse;
import es.uma.fitness.dto.ReviewSummaryResponse;
import es.uma.fitness.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/exercises/{exerciseId}")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PutMapping("/review")
    public ReviewResponse save(Principal principal,
                               @PathVariable Long exerciseId,
                               @Valid @RequestBody ReviewRequest request) {
        return reviewService.save(principal.getName(), exerciseId, request);
    }

    @DeleteMapping("/review")
    public ResponseEntity<Void> delete(Principal principal, @PathVariable Long exerciseId) {
        reviewService.delete(principal.getName(), exerciseId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/reviews/summary")
    public ReviewSummaryResponse summary(Principal principal, @PathVariable Long exerciseId) {
        return reviewService.getSummary(principal.getName(), exerciseId);
    }
}