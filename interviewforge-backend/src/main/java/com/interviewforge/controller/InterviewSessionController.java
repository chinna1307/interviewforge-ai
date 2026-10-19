package com.interviewforge.controller;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.interviewforge.dto.InterviewResult;
import com.interviewforge.dto.SessionSummaryDto;
import com.interviewforge.entity.InterviewQuestionEntity;
import com.interviewforge.entity.InterviewSession;
import com.interviewforge.repository.InterviewQuestionRepository;
import com.interviewforge.service.InterviewSessionService;

@RestController
@RequestMapping("/api/interviews")
public class InterviewSessionController {

    private final InterviewSessionService interviewSessionService;
    private final InterviewQuestionRepository interviewQuestionRepository;

    public InterviewSessionController(
            InterviewSessionService interviewSessionService,
            InterviewQuestionRepository interviewQuestionRepository) {

        this.interviewSessionService = interviewSessionService;
        this.interviewQuestionRepository = interviewQuestionRepository;
    }

    @GetMapping("/start/{resumeId}")
    public InterviewSession startInterview(
            @PathVariable Long resumeId,
            Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : null;
        interviewSessionService.verifyActiveReadyResumeOwnership(resumeId, userEmail);
        return interviewSessionService.startInterview(resumeId);
    }

    @GetMapping("/history")
    public List<SessionSummaryDto> getHistory(Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : null;
        if (userEmail == null || userEmail.isBlank()) {
            throw new org.springframework.security.access.AccessDeniedException("Authentication required.");
        }
        return interviewSessionService.getUserSessionHistory(userEmail);
    }

    @GetMapping("/{sessionId}")
    public InterviewSession getSession(
            @PathVariable Long sessionId,
            Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : null;
        return interviewSessionService.verifySessionOwnership(sessionId, userEmail);
    }

    @GetMapping("/{sessionId}/result")
    public InterviewResult getInterviewResult(
            @PathVariable Long sessionId,
            Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : null;
        interviewSessionService.verifySessionOwnership(sessionId, userEmail);
        return interviewSessionService.getInterviewResult(sessionId);
    }

    @GetMapping("/{sessionId}/questions")
    public List<InterviewQuestionEntity> getQuestions(
            @PathVariable Long sessionId,
            Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : null;
        interviewSessionService.verifySessionOwnership(sessionId, userEmail);
        return interviewQuestionRepository.findBySessionIdOrderByQuestionNumber(sessionId);
    }
}