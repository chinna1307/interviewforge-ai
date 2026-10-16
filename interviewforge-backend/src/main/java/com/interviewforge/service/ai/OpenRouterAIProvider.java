package com.interviewforge.service.ai;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class OpenRouterAIProvider implements AIProvider {

    private final ChatClient chatClient;

    public OpenRouterAIProvider(
            @Qualifier("openRouterChatClient") ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    @Override
    public String getName() {
        return "OpenRouter";
    }

    @Override
    public String chat(String prompt) {
        return chatClient
                .prompt()
                .user(prompt)
                .call()
                .content();
    }

    @Override
    public <T> T chat(String prompt, Class<T> responseType) {
        return chatClient
                .prompt()
                .user(prompt)
                .call()
                .entity(responseType);
    }
}