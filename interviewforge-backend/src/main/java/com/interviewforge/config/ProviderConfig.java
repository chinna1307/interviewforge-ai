package com.interviewforge.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for OpenAI-compatible AI providers (Groq, OpenRouter).
 *
 * Each provider gets its own OpenAiChatModel → ChatClient pipeline.
 * The base URL and API key are set via OpenAiChatOptions, and the
 * OpenAiChatModel.Builder creates the underlying OpenAI SDK client
 * internally.
 *
 * These beans are explicitly named so they don't conflict with the
 * existing Gemini ChatClient defined in AIConfig.
 */
@Configuration
public class ProviderConfig {

    // ========================================
    // GROQ
    // ========================================

    @Value("${groq.api-key}")
    private String groqApiKey;

    @Value("${groq.base-url}")
    private String groqBaseUrl;

    @Value("${groq.model}")
    private String groqModel;

    // ========================================
    // OPENROUTER
    // ========================================

    @Value("${openrouter.api-key}")
    private String openRouterApiKey;

    @Value("${openrouter.base-url}")
    private String openRouterBaseUrl;

    @Value("${openrouter.model}")
    private String openRouterModel;


    @Bean("groqChatClient")
    public ChatClient groqChatClient() {

        OpenAiChatModel model = OpenAiChatModel.builder()
                .options(OpenAiChatOptions.builder()
                        .baseUrl(groqBaseUrl)
                        .apiKey(groqApiKey)
                        .model(groqModel)
                        .build())
                .build();

        return ChatClient.builder(model).build();
    }

    @Bean("openRouterChatClient")
    public ChatClient openRouterChatClient() {

        OpenAiChatModel model = OpenAiChatModel.builder()
                .options(OpenAiChatOptions.builder()
                        .baseUrl(openRouterBaseUrl)
                        .apiKey(openRouterApiKey)
                        .model(openRouterModel)
                        .build())
                .build();

        return ChatClient.builder(model).build();
    }
}
