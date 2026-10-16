package com.interviewforge.dto;

public record AuthResponse(
        String token,
        String email,
        String name,
        String role
) {
}