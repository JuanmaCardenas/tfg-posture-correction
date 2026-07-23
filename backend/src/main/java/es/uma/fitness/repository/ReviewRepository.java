package es.uma.fitness.repository;

import es.uma.fitness.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    Optional<Review> findByUserIdAndExerciseId(Long userId, Long exerciseId);
}