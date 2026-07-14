package es.uma.fitness.service;

import es.uma.fitness.dto.RegisterRequest;
import es.uma.fitness.model.Role;
import es.uma.fitness.model.User;
import es.uma.fitness.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("El nombre de usuario ya está en uso");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("El email ya está registrado");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .build();

        return userRepository.save(user);
    }
}