package es.uma.fitness.repository;

import es.uma.fitness.exercise.Exercise;
import es.uma.fitness.model.Difficulty;
import es.uma.fitness.model.MuscleGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Set;

public interface ExerciseRepository extends JpaRepository<Exercise, Long> {

    @Query(value = """
            SELECT DISTINCT e FROM Exercise e
            JOIN e.muscleGroups g
            WHERE LOWER(e.name) LIKE LOWER(CONCAT('%', :search, '%'))
              AND e.difficulty IN :difficulties
              AND g IN :groups
            """,
            countQuery = """
                    SELECT COUNT(DISTINCT e) FROM Exercise e
                    JOIN e.muscleGroups g
                    WHERE LOWER(e.name) LIKE LOWER(CONCAT('%', :search, '%'))
                      AND e.difficulty IN :difficulties
                      AND g IN :groups
                    """)
    Page<Exercise> search(@Param("search") String search,
                          @Param("groups") Set<MuscleGroup> groups,
                          @Param("difficulties") Set<Difficulty> difficulties,
                          Pageable pageable);
}