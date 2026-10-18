package com.interviewforge.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;

import com.interviewforge.dto.ResumeAnalysis;
import com.interviewforge.entity.Resume;
import com.interviewforge.entity.ResumeProcessingStatus;
import com.interviewforge.repository.ResumeRepository;
import com.interviewforge.service.ai.AIProviderRouter;

class ResumeAnalysisServiceTest {

    private ChatClient chatClient;
    private AIProviderRouter aiProviderRouter;
    private ResumeRepository resumeRepository;
    private ResumeAnalysisService resumeAnalysisService;

    @BeforeEach
    void setUp() {
        chatClient = mock(ChatClient.class);
        aiProviderRouter = mock(AIProviderRouter.class);
        resumeRepository = mock(ResumeRepository.class);
        resumeAnalysisService = new ResumeAnalysisService(chatClient, aiProviderRouter, resumeRepository);
    }

    @Test
    void testAnalyzeResume_whenPrimaryGeminiFails_fallsBackToRouterWithExtractedText() {
        Long resumeId = 4L;
        Resume resume = new Resume();
        resume.setId(resumeId);
        resume.setFileName("john_doe_resume.pdf");
        resume.setExtractedText("Experienced Full Stack Engineer with Java, Spring Boot, React, and PostgreSQL.");
        resume.setProcessingStatus(ResumeProcessingStatus.READY);

        when(resumeRepository.findById(resumeId)).thenReturn(Optional.of(resume));

        // Primary ChatClient throws (e.g. Gemini API error or RAG failure)
        when(chatClient.prompt()).thenThrow(new RuntimeException("Gemini quota exceeded"));

        ResumeAnalysis expected = new ResumeAnalysis(
                List.of("Java", "Spring Boot", "React", "PostgreSQL"),
                List.of("Strong backend foundations"),
                List.of("Could improve cloud deployment details"),
                List.of("Docker", "Kubernetes"),
                List.of("Projects are relevant to current stack"),
                List.of("Add measurable metrics to project achievements")
        );

        when(aiProviderRouter.chat(
                argThat(prompt -> prompt.contains("Experienced Full Stack Engineer")),
                eq(ResumeAnalysis.class)
        )).thenReturn(expected);

        ResumeAnalysis result = resumeAnalysisService.analyzeResume(resumeId);

        assertNotNull(result);
        assertEquals(expected, result);
        verify(aiProviderRouter).chat(any(), eq(ResumeAnalysis.class));
    }

    @Test
    void testAnalyzeResume_whenResumeNotFound_throwsIllegalArgumentException() {
        when(chatClient.prompt()).thenThrow(new RuntimeException("Gemini error"));
        when(resumeRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> resumeAnalysisService.analyzeResume(999L));
    }
}
