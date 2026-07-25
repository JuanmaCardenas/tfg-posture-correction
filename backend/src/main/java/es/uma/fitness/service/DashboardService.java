package es.uma.fitness.service;

import es.uma.fitness.dto.DashboardSummaryResponse;
import es.uma.fitness.exception.UserNotFoundException;
import es.uma.fitness.model.User;
import es.uma.fitness.repository.AnalysisResultRepository;
import es.uma.fitness.repository.FavoriteRepository;
import es.uma.fitness.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final FavoriteRepository favoriteRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary(String username) {
        User user = userRepository.findByUsername(username).orElseThrow(UserNotFoundException::new);
        long favorites = favoriteRepository.countByUserId(user.getId());
        long analyses = analysisResultRepository.countByUserId(user.getId());
        return new DashboardSummaryResponse(favorites, analyses);
    }
}