package com.interviewforge.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.interviewforge.dto.InterviewQuestionSet;
import com.interviewforge.service.MockInterviewService;

@RestController
@RequestMapping("/api/resumes")
public class ResumeInterviewController {

    private final MockInterviewService mockInterviewService;

    public ResumeInterviewController(
            MockInterviewService mockInterviewService) {

        this.mockInterviewService = mockInterviewService;
    }

    @GetMapping("/{resumeId}/interview/questions")
    public InterviewQuestionSet generateQuestions(
            @PathVariable Long resumeId) {

        return mockInterviewService.generateQuestions(resumeId);
    }
}