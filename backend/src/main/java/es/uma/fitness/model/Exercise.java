package es.uma.fitness.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "exercises")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 120)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "exercise_muscle_groups",
            joinColumns = @JoinColumn(name = "exercise_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "muscle_group", nullable = false, length = 20)
    @BatchSize(size = 25)
    @Builder.Default
    private Set<MuscleGroup> muscleGroups = EnumSet.noneOf(MuscleGroup.class);

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Difficulty difficulty;

    @Column(name = "youtube_video_id", nullable = false, length = 20)
    private String youtubeVideoId;

    @ElementCollection
    @CollectionTable(
            name = "exercise_tips",
            joinColumns = @JoinColumn(name = "exercise_id")
    )
    @Column(name = "tip", nullable = false, length = 300)
    @OrderColumn(name = "tip_order")
    @Builder.Default
    private List<String> tips = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_type", length = 20)
    private AnalysisType analysisType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}