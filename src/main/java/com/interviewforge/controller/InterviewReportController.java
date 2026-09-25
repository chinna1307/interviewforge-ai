package com.interviewforge.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.interviewforge.dto.InterviewReport;
import com.interviewforge.service.InterviewReportService;

@RestController
@RequestMapping("/api/interviews")
public class InterviewReportController {

    private final InterviewReportService interviewReportService;

    public InterviewReportController(
            InterviewReportService interviewReportService) {

        this.interviewReportService = interviewReportService;
    }

    @GetMapping("/{sessionId}/report")
    public InterviewReport generateReport(
            @PathVariable Long sessionId) {

        return interviewReportService.generateReport(sessionId);
    }
}