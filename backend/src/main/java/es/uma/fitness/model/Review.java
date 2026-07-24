package es.uma.fitness.model;

import es.uma.fitness.util.AppTime;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "reviews",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_review_user_exercise",
                columnNames = {"user_id", "exercise_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    /**
     * Puntuación de 1 a 5 estrellas. El rango se valida en el DTO de entrada.
     */
    @Column(nullable = false)
    private int score;

    /**
     * Comentario opcional: se puede puntuar sin escribir nada.
     */
    @Column(length = 500)
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = AppTime.now();
        this.updatedAt = this.createdAt;   // solo donde exista updatedAt
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = AppTime.now();
    }
}