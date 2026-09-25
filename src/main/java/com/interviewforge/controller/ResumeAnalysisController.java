package com.interviewforge.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.interviewforge.dto.ResumeAnalysis;
import com.interviewforge.service.ResumeAnalysisService;

@RestController
@RequestMapping("/api/resumes")
public class ResumeAnalysisController {

    private final ResumeAnalysisService resumeAnalysisService;

    public ResumeAnalysisController(
            ResumeAnalysisService resumeAnalysisService) {

        this.resumeAnalysisService = resumeAnalysisService;
    }

    @GetMapping("/{resumeId}/analysis")
    public ResumeAnalysis analyzeResume(
            @PathVariable Long resumeId) {

        return resumeAnalysisService.analyzeResume(resumeId);
    }
}