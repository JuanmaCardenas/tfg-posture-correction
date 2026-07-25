package es.uma.fitness.repository;

import es.uma.fitness.model.AnalysisResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
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

    int countByUserId(Long userId);
}