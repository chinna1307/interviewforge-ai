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
        if (authentication != null) {
            interviewSessionService.verifyResumeOwnership(resumeId, authentication.getName());
        }
        return interviewSessionService.startInterview(resumeId);
    }

    @GetMapping("/history")
    public List<SessionSummaryDto> getHistory(Authentication authentication) {
        return interviewSessionService.getUserSessionHistory(authentication.getName());
    }

    @GetMapping("/{sessionId}")
    public InterviewSession getSession(
            @PathVariable Long sessionId,
            Authentication authentication) {
        if (authentication != null) {
            return interviewSessionService.verifySessionOwnership(sessionId, authentication.getName());
        }
        return interviewSessionService.getSession(sessionId);
    }

    @GetMapping("/{sessionId}/result")
    public InterviewResult getInterviewResult(
            @PathVariable Long sessionId,
            Authentication authentication) {
        if (authentication != null) {
            interviewSessionService.verifySessionOwnership(sessionId, authentication.getName());
        }
        return interviewSessionService.getInterviewResult(sessionId);
    }

    @GetMapping("/{sessionId}/questions")
    public List<InterviewQuestionEntity> getQuestions(
            @PathVariable Long sessionId,
            Authentication authentication) {
        if (authentication != null) {
            interviewSessionService.verifySessionOwnership(sessionId, authentication.getName());
        }
        return interviewQuestionRepository.findBySessionIdOrderByQuestionNumber(sessionId);
    }
}