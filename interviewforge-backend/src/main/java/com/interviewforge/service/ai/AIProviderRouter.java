package com.interviewforge.service.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AIProviderRouter {

    private static final Logger log = LoggerFactory.getLogger(AIProviderRouter.class);

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
            log.warn("Groq provider execution failed [{}]: {}. Switching to OpenRouter fallback.",
                    groqException.getClass().getSimpleName(), groqException.getMessage(), groqException);
            try {
                return openRouterProvider.chat(prompt);
            } catch (Exception openRouterException) {
                log.error("Both primary (Groq) and fallback (OpenRouter) providers failed. OpenRouter error [{}]: {}",
                        openRouterException.getClass().getSimpleName(), openRouterException.getMessage(), openRouterException);
                throw openRouterException;
            }
        }
    }

    public <T> T chat(String prompt, Class<T> responseType) {
        try {
            return groqProvider.chat(prompt, responseType);
        } catch (Exception groqException) {
            log.warn("Groq provider execution failed [{}]: {}. Switching to OpenRouter fallback.",
                    groqException.getClass().getSimpleName(), groqException.getMessage(), groqException);
            try {
                return openRouterProvider.chat(prompt, responseType);
            } catch (Exception openRouterException) {
                log.error("Both primary (Groq) and fallback (OpenRouter) providers failed. OpenRouter error [{}]: {}",
                        openRouterException.getClass().getSimpleName(), openRouterException.getMessage(), openRouterException);
                throw openRouterException;
            }
        }
    }
}