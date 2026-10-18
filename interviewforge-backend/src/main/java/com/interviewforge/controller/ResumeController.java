package com.interviewforge.controller;

import java.io.IOException;
import java.util.List;

import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.StringUtils;

import com.interviewforge.dto.ResumeSummaryDto;
import com.interviewforge.dto.ResumeUploadResponse;
import com.interviewforge.entity.User;
import com.interviewforge.repository.ResumeRepository;
import com.interviewforge.repository.UserRepository;
import com.interviewforge.service.ResumeService;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    private final ResumeService resumeService;
    private final UserRepository userRepository;
    private final ResumeRepository resumeRepository;

    @Autowired
    public ResumeController(
            ResumeService resumeService,
            UserRepository userRepository,
            ResumeRepository resumeRepository) {
        this.resumeService = resumeService;
        this.userRepository = userRepository;
        this.resumeRepository = resumeRepository;
    }

    // Preserve constructor for existing unit test compatibility
    public ResumeController(
            ResumeService resumeService,
            UserRepository userRepository) {
        this(resumeService, userRepository, null);
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadResume(
            @RequestParam("file") MultipartFile file,
            Authentication authentication)
            throws IOException, TikaException {

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body("Please select a resume file");
        }

        String originalFilename = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "resume");
        String lowerName = originalFilename.toLowerCase(java.util.Locale.ROOT);
        if (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".docx") && !lowerName.endsWith(".doc")) {
            throw new IllegalArgumentException("Only PDF and DOCX resume files are supported.");
        }

        Tika tika = new Tika();
        byte[] content = file.getBytes();
        String extractedText = tika.parseToString(new java.io.ByteArrayInputStream(content));
        String detectedType = tika.detect(content, originalFilename);
        if (!detectedType.equals("application/pdf")
                && !detectedType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                && !detectedType.equals("application/msword")) {
            throw new IllegalArgumentException("The uploaded file content does not match a supported resume format.");
        }

        if (extractedText == null || extractedText.isBlank()) {
            throw new IllegalArgumentException("Could not extract readable text from the uploaded resume.");
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ResumeUploadResponse response = resumeService.processResume(
                originalFilename,
                detectedType,
                content,
                extractedText,
                user
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{resumeId}/retry")
    public ResponseEntity<ResumeUploadResponse> retryResume(
            @PathVariable Long resumeId,
            Authentication authentication) {
        ResumeUploadResponse response = resumeService.retryResumeEmbedding(resumeId, authentication.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my")
    public List<ResumeSummaryDto> getMyResumes(Authentication authentication) {
        if (resumeRepository == null) {
            return List.of();
        }
        return resumeRepository.findByUserEmailOrderByUploadedAtDesc(authentication.getName())
                .stream()
                .map(r -> new ResumeSummaryDto(
                        r.getId(),
                        r.getFileName(),
                        r.getFileType(),
                        r.getUploadedAt(),
                        r.getProcessingStatus().name()
                ))
                .toList();
    }
}