package es.uma.fitness.dto;

public record DashboardSummaryResponse(
        long favoriteCount,
        long analysisCount
) {
}