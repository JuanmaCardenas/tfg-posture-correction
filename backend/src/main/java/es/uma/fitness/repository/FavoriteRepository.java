package es.uma.fitness.repository;

import es.uma.fitness.model.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;
import java.util.Set;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    Optional<Favorite> findByUserIdAndExerciseId(Long userId, Long exerciseId);

    int countByUserId(Long userId);

    /**
     * Cuáles de estos ejercicios ha marcado el usuario, en una sola consulta.
     */
    @Query("""
            SELECT f.exercise.id FROM Favorite f
            WHERE f.user.id = :userId
              AND f.exercise.id IN :exerciseIds
            """)
    Set<Long> findFavoritedExerciseIds(@Param("userId") Long userId,
                                       @Param("exerciseIds") Collection<Long> exerciseIds);
}