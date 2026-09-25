package com.interviewforge.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.interviewforge.service.ai.GroqAIProvider;
import com.interviewforge.service.ai.OpenRouterAIProvider;

/**
 * Test endpoints to verify Groq and OpenRouter integration independently.
 *
 * These endpoints are under /api/ai/** which is already permitAll()
 * in SecurityConfig — no authentication required.
 */
@RestController
@RequestMapping("/api/ai")
public class AIProviderTestController {

    private final GroqAIProvider groqProvider;
    private final OpenRouterAIProvider openRouterProvider;

    public AIProviderTestController(
            GroqAIProvider groqProvider,
            OpenRouterAIProvider openRouterProvider) {

        this.groqProvider = groqProvider;
        this.openRouterProvider = openRouterProvider;
    }

    @GetMapping("/groq-test")
    public Map<String, String> testGroq(
            @RequestParam(defaultValue = "Explain Java inheritance in one sentence.") String prompt) {

        String response = groqProvider.chat(prompt);

        return Map.of(
                "provider", groqProvider.getName(),
                "prompt", prompt,
                "response", response
        );
    }

    @GetMapping("/openrouter-test")
    public Map<String, String> testOpenRouter(
            @RequestParam(defaultValue = "Explain Java inheritance in one sentence.") String prompt) {

        String response = openRouterProvider.chat(prompt);

        return Map.of(
                "provider", openRouterProvider.getName(),
                "prompt", prompt,
                "response", response
        );
    }
}
