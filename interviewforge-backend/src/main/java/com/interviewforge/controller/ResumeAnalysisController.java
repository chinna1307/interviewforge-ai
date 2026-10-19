package com.interviewforge.controller;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.interviewforge.dto.ResumeAnalysis;
import com.interviewforge.entity.Resume;
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

        Resume resume = resumeRepository.findByIdAndUserEmail(resumeId, authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("Resume not found or access denied."));

        if (!resume.isActive()) {
            throw new AccessDeniedException("Resume is not the active resume.");
        }

        if (resume.getExtractedText() == null || resume.getExtractedText().isBlank()) {
            throw new IllegalStateException("Resume extracted text is missing. Please re-upload your resume.");
        }

        return resumeAnalysisService.analyzeResume(resumeId);
    }

    @GetMapping("/analysis")
    public ResumeAnalysis analyzeActiveResume(Authentication authentication) {
        Resume active = resumeRepository.findFirstByUserEmailAndActiveTrue(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("No active resume found for this user."));

        if (active.getExtractedText() == null || active.getExtractedText().isBlank()) {
            throw new IllegalStateException("Resume extracted text is missing. Please re-upload your resume.");
        }

        return resumeAnalysisService.analyzeResume(active.getId());
    }
}