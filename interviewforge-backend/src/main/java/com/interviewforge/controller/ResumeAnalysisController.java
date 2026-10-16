package com.interviewforge.controller;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.interviewforge.dto.ResumeAnalysis;
import com.interviewforge.repository.ResumeRepository;
import com.interviewforge.service.ResumeAnalysisService;

@RestController
@RequestMapping("/api/resumes")
public class ResumeAnalysisController {

    private final ResumeAnalysisService resumeAnalysisService;
    private final ResumeRepository resumeRepository;

    public ResumeAnalysisController(
            ResumeAnalysisService resumeAnalysisService,
            ResumeRepository resumeRepository) {
        this.resumeAnalysisService = resumeAnalysisService;
        this.resumeRepository = resumeRepository;
    }

    @GetMapping("/{resumeId}/analysis")
    public ResumeAnalysis analyzeResume(
            @PathVariable Long resumeId,
            Authentication authentication) {

        resumeRepository.findByIdAndUserEmail(resumeId, authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("Resume not found or access denied."));

        return resumeAnalysisService.analyzeResume(resumeId);
    }
}