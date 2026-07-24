package es.uma.fitness.service;

import es.uma.fitness.exception.ExerciseNotFoundException;
import es.uma.fitness.model.Exercise;
import es.uma.fitness.model.Favorite;
import es.uma.fitness.model.User;
import es.uma.fitness.repository.ExerciseRepository;
import es.uma.fitness.repository.FavoriteRepository;
import es.uma.fitness.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final ExerciseRepository exerciseRepository;

    @Transactional
    public void add(String username, Long exerciseId) {
        User user = userRepository.findByUsername(username).orElseThrow();
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ExerciseNotFoundException(exerciseId));

        // Marcar algo ya marcado no es un error: el estado pedido ya se cumple.
        if (favoriteRepository.findByUserIdAndExerciseId(user.getId(), exerciseId).isPresent()) {
            return;
        }

        favoriteRepository.save(Favorite.builder()
                .user(user)
                .exercise(exercise)
                .build());
    }

    @Transactional
    public void remove(String username, Long exerciseId) {
        User user = userRepository.findByUsername(username).orElseThrow();
        favoriteRepository.findByUserIdAndExerciseId(user.getId(), exerciseId)
                .ifPresent(favoriteRepository::delete);
    }
}