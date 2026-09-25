package com.interviewforge.service.ai;

import org.springframework.stereotype.Service;

@Service
public class AIProviderRouter {

    private final AIProvider groqProvider;
    private final AIProvider openRouterProvider;

    public AIProviderRouter(
            GroqAIProvider groqProvider,
            OpenRouterAIProvider openRouterProvider) {

        this.groqProvider = groqProvider;
        this.openRouterProvider = openRouterProvider;
    }

    public String chat(String prompt) {

        try {
            return groqProvider.chat(prompt);

        } catch (Exception groqException) {

            System.out.println(
                    "Groq failed. Switching to OpenRouter..."
            );

            return openRouterProvider.chat(prompt);
        }
    }

    public <T> T chat(String prompt, Class<T> responseType) {

        try {
            return groqProvider.chat(prompt, responseType);

        } catch (Exception groqException) {

            System.out.println(
                    "Groq failed. Switching to OpenRouter..."
            );

            return openRouterProvider.chat(prompt, responseType);
        }
    }
}