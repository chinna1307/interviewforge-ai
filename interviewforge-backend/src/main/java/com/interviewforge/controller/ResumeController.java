package com.interviewforge.controller;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.interviewforge.dto.ResumeSummaryDto;
import com.interviewforge.dto.ResumeUploadResponse;
import com.interviewforge.entity.Resume;
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
            @RequestParam(value = "replace", defaultValue = "false") boolean replace,
            Authentication authentication)
            throws IOException, TikaException {
        return handleUploadInternal(file, authentication, replace);
    }

    public ResponseEntity<?> uploadResume(
            MultipartFile file,
            Authentication authentication)
            throws IOException, TikaException {
        return uploadResume(file, false, authentication);
    }

    @PostMapping("/replace")
    public ResponseEntity<?> replaceResume(
            @RequestParam("file") MultipartFile file,
            Authentication authentication)
            throws IOException, TikaException {
        return handleUploadInternal(file, authentication, true);
    }

    private ResponseEntity<?> handleUploadInternal(
            MultipartFile file,
            Authentication authentication,
            boolean replaceConfirmed) throws IOException, TikaException {

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

        // If replacement is not explicitly confirmed, check whether user has an active resume with different content
        if (!replaceConfirmed) {
            Optional<Resume> activeOpt = resumeService.getActiveResume(user);
            if (activeOpt.isPresent()) {
                String newHash = ResumeService.calculateSha256(content);
                Resume activeResume = activeOpt.get();
                if (!newHash.equals(activeResume.getFileHash())) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                            "message", "You already have a resume uploaded. If you continue, your current resume, its AI analysis, and its indexed data will be replaced by the new resume. This action cannot be undone.",
                            "requiresConfirmation", true,
                            "existingResumeId", activeResume.getId(),
                            "existingFileName", activeResume.getFileName()
                    ));
                }
            }
        }

        ResumeUploadResponse response = replaceConfirmed
                ? resumeService.processResume(originalFilename, detectedType, content, extractedText, user, true)
                : resumeService.processResume(originalFilename, detectedType, content, extractedText, user);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{resumeId}/retry")
    public ResponseEntity<ResumeUploadResponse> retryResume(
            @PathVariable Long resumeId,
            Authentication authentication) {
        ResumeUploadResponse response = resumeService.retryResumeEmbedding(resumeId, authentication.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/current")
    public ResponseEntity<?> getCurrentResume(Authentication authentication) {
        if (resumeRepository == null) {
            return ResponseEntity.noContent().build();
        }
        return resumeRepository.findFirstByUserEmailAndActiveTrue(authentication.getName())
                .map(r -> ResponseEntity.ok(new ResumeSummaryDto(
                        r.getId(),
                        r.getFileName(),
                        r.getFileType(),
                        r.getUploadedAt(),
                        r.getProcessingStatus() != null ? r.getProcessingStatus().name() : "INDEXING_PENDING",
                        r.isActive()
                )))
                .orElseGet(() -> ResponseEntity.noContent().build());
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
                        r.getProcessingStatus() != null ? r.getProcessingStatus().name() : "INDEXING_PENDING",
                        r.isActive()
                ))
                .toList();
    }
}