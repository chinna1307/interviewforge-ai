package com.interviewforge.dto;

public record LoginRequest(
        String email,
        String password
) {
}