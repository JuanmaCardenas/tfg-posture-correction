package es.uma.fitness.controller;

import es.uma.fitness.dto.AnalysisResultRequest;
import es.uma.fitness.dto.AnalysisResultResponse;
import es.uma.fitness.dto.PageResponse;
import es.uma.fitness.service.AnalysisResultService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/analyses")
@RequiredArgsConstructor
public class AnalysisResultController {

    private final AnalysisResultService analysisResultService;

    @PostMapping
    public ResponseEntity<AnalysisResultResponse> save(Principal principal,
                                                       @Valid @RequestBody AnalysisResultRequest request) {
        AnalysisResultResponse saved = analysisResultService.save(principal.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    public PageResponse<AnalysisResultResponse> findMine(Principal principal, Pageable pageable) {
        return analysisResultService.findByUser(principal.getName(), pageable);
    }
}