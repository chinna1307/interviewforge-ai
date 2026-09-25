package com.interviewforge.controller;

import org.springframework.stereotype.Controller; 
import org.springframework.web.bind.annotation.RequestBody;

import com.interviewforge.dto.AuthResponse;
import com.interviewforge.dto.LoginRequest;
import com.interviewforge.util.JwtService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.interviewforge.entity.User;
import com.interviewforge.service.UserService;

@Controller
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService, JwtService jwtService) {
        this.userService = userService;
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

        String token = jwtService.generateToken(user.getEmail());

        return token;
    }
    
    @PostMapping("/api/auth/login")
    @ResponseBody
    public AuthResponse apiLogin(
            @RequestBody LoginRequest request) {

        User user = userService.loginUser(
                request.email(),
                request.password()
        );

        String token = jwtService.generateToken(
                user.getEmail()
        );

        return new AuthResponse(
                token,
                user.getEmail(),
                user.getName(),
                user.getRole()
        );
    }
    @PostMapping("/register")
    public String register(
            @RequestParam String name,
            @RequestParam String email,
            @RequestParam String password) {

        User user = new User();

        user.setName(name);
        user.setEmail(email);
        user.setPassword(password);

        userService.registerUser(user);

        return "redirect:/";

    }
    private final JwtService jwtService;
    
}