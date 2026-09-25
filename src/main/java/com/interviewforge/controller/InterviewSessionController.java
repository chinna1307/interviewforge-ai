package com.interviewforge.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.interviewforge.entity.InterviewQuestionEntity;
import com.interviewforge.entity.InterviewSession;
import com.interviewforge.repository.InterviewQuestionRepository;
import com.interviewforge.service.InterviewSessionService;
import com.interviewforge.dto.InterviewResult;

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
            @PathVariable Long resumeId) {

        return interviewSessionService.startInterview(resumeId);
    }

    @GetMapping("/{sessionId}")
    public InterviewSession getSession(
            @PathVariable Long sessionId) {

        return interviewSessionService.getSession(sessionId);
    }

    @GetMapping("/{sessionId}/result")
    public InterviewResult getInterviewResult(
            @PathVariable Long sessionId) {

        return interviewSessionService.getInterviewResult(sessionId);
    }
    @GetMapping("/{sessionId}/questions")
    public List<InterviewQuestionEntity> getQuestions(
            @PathVariable Long sessionId) {

        return interviewQuestionRepository
                .findBySessionIdOrderByQuestionNumber(sessionId);
    }
}