package com.interviewforge.service.ai;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class GroqAIProvider implements AIProvider {

    private final ChatClient chatClient;

    public GroqAIProvider(
            @Qualifier("groqChatClient") ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    @Override
    public String getName() {
        return "Groq";
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