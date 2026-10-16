package com.interviewforge.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.interviewforge.dto.AuthResponse;
import com.interviewforge.dto.LoginRequest;
import com.interviewforge.dto.RegisterRequest;
import com.interviewforge.entity.User;
import com.interviewforge.repository.UserRepository;
import com.interviewforge.service.UserService;
import com.interviewforge.util.JwtService;

@Controller
public class AuthController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    public AuthController(
            UserService userService,
            UserRepository userRepository,
            JwtService jwtService) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    @GetMapping("/register")
    public String showRegisterPage() {
        return "register";
    }

    @GetMapping("/login")
    public String showLoginPage() {
        return "login";
    }

    @PostMapping("/login")
    @ResponseBody
    public String login(
            @RequestParam String email,
            @RequestParam String password) {
        User user = userService.loginUser(email, password);
        return jwtService.generateToken(user.getEmail());
    }

    @PostMapping("/api/auth/login")
    @ResponseBody
    public AuthResponse apiLogin(@RequestBody LoginRequest request) {
        if (request.email() == null || request.email().isBlank() ||
            request.password() == null || request.password().isBlank()) {
            throw new IllegalArgumentException("Email and password are required.");
        }
        User user = userService.loginUser(request.email().trim(), request.password());
        String token = jwtService.generateToken(user.getEmail());
        return new AuthResponse(token, user.getEmail(), user.getName(), user.getRole());
    }

    @PostMapping(value = "/register", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public String registerForm(
            @RequestParam String name,
            @RequestParam String email,
            @RequestParam String password) {
        User user = new User();
        user.setName(name.trim());
        user.setEmail(email.trim());
        user.setPassword(password);
        userService.registerUser(user);
        return "redirect:/";
    }

    @PostMapping(value = {"/register", "/api/auth/register"}, consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<AuthResponse> apiRegister(@RequestBody RegisterRequest request) {
        if (request.name() == null || request.name().isBlank() ||
            request.email() == null || request.email().isBlank() ||
            request.password() == null || request.password().length() < 6) {
            throw new IllegalArgumentException("Name, valid email, and a password of at least 6 characters are required.");
        }
        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setPassword(request.password());
        User saved = userService.registerUser(user);
        String token = jwtService.generateToken(saved.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthResponse(token, saved.getEmail(), saved.getName(), saved.getRole()));
    }

    @GetMapping("/api/auth/me")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "role", user.getRole() != null ? user.getRole() : "CANDIDATE",
                "createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : ""
        ));
    }
}