package com.interviewforge.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lightweight health-check controller for deployment monitoring (Render, etc.).
 *
 * This endpoint performs no database queries, AI provider calls, or resume processing,
 * returning a simple HTTP 200 status when the Spring context is active.
 */
@RestController
public class HealthController {

    @GetMapping(value = {"/health", "/api/health"})
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }
}
