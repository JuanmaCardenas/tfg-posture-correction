package es.uma.fitness.controller;

import es.uma.fitness.dto.UserResponse;
import es.uma.fitness.model.User;
import es.uma.fitness.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(Principal principal) {
        User user = userRepository.findByUsername(principal.getName()).orElseThrow();
        UserResponse response = new UserResponse(
                user.getId(), user.getUsername(), user.getEmail(),
                user.getRole(), user.getCreatedAt());
        return ResponseEntity.ok(response);
    }
}