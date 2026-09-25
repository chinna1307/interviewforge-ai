package com.interviewforge.controller;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class RAGController {

    private final ChatClient chatClient;

    public RAGController(ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    @GetMapping("/rag")
    public String askAI(
            @RequestParam Long resumeId,
            @RequestParam String question) {

        return chatClient
                .prompt()
                .user(question)
                .advisors(a -> a.param(
                        "qa_filter_expression",
                        "resumeId == '" + resumeId + "'"
                ))
                .call()
                .content();
    }
}