package es.uma.fitness.repository;

import es.uma.fitness.dto.ExerciseRatingAggregate;
import es.uma.fitness.dto.ScoreCountResponse;
import es.uma.fitness.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    Optional<Review> findByUserIdAndExerciseId(Long userId, Long exerciseId);

    /**
     * Media y número de valoraciones de varios ejercicios en una sola consulta.
     * Evita lanzar dos consultas por cada tarjeta del catálogo (problema N+1).
     */
    @Query("""
            SELECT new es.uma.fitness.dto.ExerciseRatingAggregate(
                       r.exercise.id, AVG(r.score), COUNT(r))
            FROM Review r
            WHERE r.exercise.id IN :exerciseIds
            GROUP BY r.exercise.id
            """)
    List<ExerciseRatingAggregate> findAggregatesByExerciseIds(
            @Param("exerciseIds") Collection<Long> exerciseIds);

    /**
     * Número de valoraciones de cada puntuación, para el histograma del detalle.
     */
    @Query("""
            SELECT new es.uma.fitness.dto.ScoreCountResponse(r.score, COUNT(r))
            FROM Review r
            WHERE r.exercise.id = :exerciseId
            GROUP BY r.score
            """)
    List<ScoreCountResponse> countByScore(@Param("exerciseId") Long exerciseId);
}