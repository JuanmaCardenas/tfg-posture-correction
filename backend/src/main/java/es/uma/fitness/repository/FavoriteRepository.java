package es.uma.fitness.repository;

import es.uma.fitness.model.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    Optional<Favorite> findByUserIdAndExerciseId(Long userId, Long exerciseId);
}