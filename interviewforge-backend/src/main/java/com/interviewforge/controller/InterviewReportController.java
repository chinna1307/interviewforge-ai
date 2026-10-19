package com.interviewforge.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.interviewforge.dto.InterviewReport;
import com.interviewforge.service.InterviewReportService;
import com.interviewforge.service.InterviewSessionService;

@RestController
@RequestMapping("/api/interviews")
public class InterviewReportController {

    private final InterviewReportService interviewReportService;
    private final InterviewSessionService interviewSessionService;

    public InterviewReportController(
            InterviewReportService interviewReportService,
            InterviewSessionService interviewSessionService) {
        this.interviewReportService = interviewReportService;
        this.interviewSessionService = interviewSessionService;
    }

    @GetMapping("/{sessionId}/report")
    public InterviewReport generateReport(
            @PathVariable Long sessionId,
            Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : null;
        interviewSessionService.verifySessionOwnership(sessionId, userEmail);
        return interviewReportService.generateReport(sessionId);
    }
}