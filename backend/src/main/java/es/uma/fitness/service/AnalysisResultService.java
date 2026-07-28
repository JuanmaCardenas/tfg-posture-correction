package es.uma.fitness.service;

import es.uma.fitness.dto.AnalysisResultRequest;
import es.uma.fitness.dto.AnalysisResultResponse;
import es.uma.fitness.dto.PageResponse;
import es.uma.fitness.exception.ExerciseNotFoundException;
import es.uma.fitness.exception.UserNotFoundException;
import es.uma.fitness.mapper.AnalysisResultMapper;
import es.uma.fitness.model.AnalysisResult;
import es.uma.fitness.model.Exercise;
import es.uma.fitness.model.User;
import es.uma.fitness.repository.AnalysisResultRepository;
import es.uma.fitness.repository.ExerciseRepository;
import es.uma.fitness.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AnalysisResultService {

    private final AnalysisResultRepository analysisResultRepository;
    private final ExerciseRepository exerciseRepository;
    private final UserRepository userRepository;

    private static final int MAX_ANALYSES_PER_USER = 10;

    @Transactional
    public AnalysisResultResponse save(String username, AnalysisResultRequest request) {
        User user = userRepository.findByUsername(username).orElseThrow(UserNotFoundException::new);
        Exercise exercise = exerciseRepository.findById(request.exerciseId())
                .orElseThrow(() -> new ExerciseNotFoundException(request.exerciseId()));

        AnalysisResult saved = analysisResultRepository.save(AnalysisResult.builder()
                .user(user)
                .exercise(exercise)
                .score(request.score())
                .build());
        
        analysisResultRepository.deleteOldestBeyondLimit(user.getId(), MAX_ANALYSES_PER_USER);

        return AnalysisResultMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<AnalysisResultResponse> findByUser(String username, Pageable pageable) {
        User user = userRepository.findByUsername(username).orElseThrow(UserNotFoundException::new);
        Page<AnalysisResult> page = analysisResultRepository.findByUser(user.getId(), pageable);

        List<AnalysisResultResponse> content = page.getContent().stream()
                .map(AnalysisResultMapper::toResponse)
                .toList();

        return new PageResponse<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast()
        );
    }
}