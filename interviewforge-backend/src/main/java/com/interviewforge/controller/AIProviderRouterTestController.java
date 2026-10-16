package com.interviewforge.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.interviewforge.service.ai.AIProviderRouter;

@RestController
@RequestMapping("/api/ai")
public class AIProviderRouterTestController {

    private final AIProviderRouter aiProviderRouter;

    public AIProviderRouterTestController(
            AIProviderRouter aiProviderRouter) {

        this.aiProviderRouter = aiProviderRouter;
    }

    @GetMapping("/router-test")
    public Map<String, String> testRouter(
            @RequestParam(defaultValue = "Say hello from the AI router") String prompt) {

        String response = aiProviderRouter.chat(prompt);

        return Map.of(
                "prompt", prompt,
                "response", response
        );
    }
}