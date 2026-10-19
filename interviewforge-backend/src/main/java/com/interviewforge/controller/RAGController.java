package com.interviewforge.controller;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

import com.interviewforge.repository.ResumeRepository;
@RestController
@RequestMapping("/api/ai")
public class RAGController {

    private final ChatClient chatClient;
    private final ResumeRepository resumeRepository;

    public RAGController(ChatClient chatClient, ResumeRepository resumeRepository) {
        this.chatClient = chatClient;
        this.resumeRepository = resumeRepository;
    }

    @GetMapping("/rag")
    public String askAI(
            @RequestParam Long resumeId,
            @RequestParam String question,
            Authentication authentication) {
        com.interviewforge.entity.Resume resume = resumeRepository.findByIdAndUserEmail(resumeId, authentication.getName())
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException(
                        "Resume not found or access denied."));

        if (!resume.isActive() || resume.getProcessingStatus() != com.interviewforge.entity.ResumeProcessingStatus.READY) {
            throw new org.springframework.security.access.AccessDeniedException("Resume is not the active ready resume.");
        }

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