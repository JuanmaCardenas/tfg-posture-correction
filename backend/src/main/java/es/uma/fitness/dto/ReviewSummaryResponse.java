package es.uma.fitness.dto;

import java.util.List;

public record ReviewSummaryResponse(
        double averageRating,
        int ratingCount,
        List<ScoreCountResponse> distribution,
        ReviewResponse myReview
) {
}