package es.uma.fitness.repository;

import es.uma.fitness.model.AnalysisResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnalysisResultRepository extends JpaRepository<AnalysisResult, Long> {

    /**
     * Análisis del usuario, del más reciente al más antiguo.
     */
    @Query(value = """
            SELECT a FROM AnalysisResult a
            JOIN FETCH a.exercise
            WHERE a.user.id = :userId
            ORDER BY a.createdAt DESC
            """,
            countQuery = "SELECT COUNT(a) FROM AnalysisResult a WHERE a.user.id = :userId")
    Page<AnalysisResult> findByUser(@Param("userId") Long userId, Pageable pageable);

    /**
     * Borra los análisis del usuario que quedan fuera de los N más recientes.
     */
    @Modifying
    @Query(value = """
            DELETE FROM analysis_results
            WHERE user_id = :userId
              AND id NOT IN (
                SELECT id FROM (
                  SELECT id FROM analysis_results
                  WHERE user_id = :userId
                  ORDER BY created_at DESC
                  LIMIT :keep
                ) AS recientes
              )
            """, nativeQuery = true)
    void deleteOldestBeyondLimit(@Param("userId") Long userId, @Param("keep") int keep);

    int countByUserId(Long userId);
}