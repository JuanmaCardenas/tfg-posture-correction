package es.uma.fitness.service;

import es.uma.fitness.dto.*;
import es.uma.fitness.exception.ExerciseNotFoundException;
import es.uma.fitness.exception.ReviewNotFoundException;
import es.uma.fitness.mapper.ReviewMapper;
import es.uma.fitness.model.Exercise;
import es.uma.fitness.model.Review;
import es.uma.fitness.model.User;
import es.uma.fitness.repository.ExerciseRepository;
import es.uma.fitness.repository.ReviewRepository;
import es.uma.fitness.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final ExerciseRepository exerciseRepository;
    private static final Sort COMMENTS_SORT = Sort.by(Sort.Direction.DESC, "createdAt");

    @Transactional
    public ReviewResponse save(String username, Long exerciseId, ReviewRequest request) {
        User user = userRepository.findByUsername(username).orElseThrow();
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ExerciseNotFoundException(exerciseId));

        // Si ya existe, se reutiliza la fila: eso es lo que implementa
        // la regla de una valoración por usuario y ejercicio.
        Review review = reviewRepository
                .findByUserIdAndExerciseId(user.getId(), exerciseId)
                .orElseGet(() -> Review.builder()
                        .user(user)
                        .exercise(exercise)
                        .build());

        review.setScore(request.score());
        review.setContent(normalize(request.content()));

        return ReviewMapper.toResponse(reviewRepository.save(review));
    }

    @Transactional
    public void delete(String username, Long exerciseId) {
        User user = userRepository.findByUsername(username).orElseThrow();

        Review review = reviewRepository
                .findByUserIdAndExerciseId(user.getId(), exerciseId)
                .orElseThrow(() -> new ReviewNotFoundException(exerciseId));

        reviewRepository.delete(review);
    }

    /**
     * Un comentario en blanco equivale a no haber escrito nada: el formulario
     * envía cadena vacía cuando el usuario solo marca estrellas, y guardarla
     * haría aparecer una entrada vacía en el listado de comentarios.
     */
    private String normalize(String content) {
        if (content == null) {
            return null;
        }
        String trimmed = content.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Transactional(readOnly = true)
    public ReviewSummaryResponse getSummary(String username, Long exerciseId) {
        if (!exerciseRepository.existsById(exerciseId)) {
            throw new ExerciseNotFoundException(exerciseId);
        }

        List<ScoreCountResponse> distribution = fillGaps(reviewRepository.countByScore(exerciseId));

        long total = distribution.stream().mapToLong(ScoreCountResponse::count).sum();
        double weighted = distribution.stream()
                .mapToDouble(d -> (double) d.score() * d.count())
                .sum();
        double average = (total == 0) ? 0.0 : round(weighted / total);

        User user = userRepository.findByUsername(username).orElseThrow();
        ReviewResponse myReview = reviewRepository
                .findByUserIdAndExerciseId(user.getId(), exerciseId)
                .map(ReviewMapper::toResponse)
                .orElse(null);

        return new ReviewSummaryResponse(average, (int) total, distribution, myReview);
    }

    @Transactional(readOnly = true)
    public PageResponse<ReviewResponse> findComments(String username, Long exerciseId, Pageable pageable) {
        if (!exerciseRepository.existsById(exerciseId)) {
            throw new ExerciseNotFoundException(exerciseId);
        }

        User user = userRepository.findByUsername(username).orElseThrow();

        Pageable effective = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(), COMMENTS_SORT);

        Page<Review> page = reviewRepository.findComments(exerciseId, user.getId(), effective);

        return PageResponse.from(page.map(ReviewMapper::toResponse));
    }

    /**
     * La consulta solo devuelve las puntuaciones que existen, pero la interfaz
     * dibuja siempre las cinco barras: las que falten se rellenan con cero.
     */
    private List<ScoreCountResponse> fillGaps(List<ScoreCountResponse> counts) {
        Map<Integer, Long> byScore = counts.stream()
                .collect(Collectors.toMap(ScoreCountResponse::score, ScoreCountResponse::count));

        return Stream.of(5, 4, 3, 2, 1)
                .map(score -> new ScoreCountResponse(score, byScore.getOrDefault(score, 0L)))
                .toList();
    }

    /**
     * Un decimal: la API no debe emitir 4.166666666666667.
     */
    static double round(double value) {
        return Math.round(value * 10) / 10.0;
    }
}