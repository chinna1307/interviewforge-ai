package com.interviewforge.controller;

import java.io.IOException;
import java.util.List;

import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Autowired;
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
            Authentication authentication)
            throws IOException, TikaException {

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body("Please select a resume file");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "resume";
        String lowerName = originalFilename.toLowerCase();
        if (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".docx") && !lowerName.endsWith(".doc")) {
            throw new IllegalArgumentException("Only PDF and DOCX resume files are supported.");
        }

        Tika tika = new Tika();
        String extractedText = tika.parseToString(file.getInputStream());

        if (extractedText == null || extractedText.isBlank()) {
            throw new IllegalArgumentException("Could not extract readable text from the uploaded resume.");
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Resume savedResume = resumeService.saveResume(
                originalFilename,
                file.getContentType(),
                extractedText,
                user
        );

        return ResponseEntity.ok(
                new ResumeUploadResponse(
                        "Resume uploaded and text extracted successfully!",
                        savedResume.getId()
                )
        );
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
                        r.getUploadedAt()
                ))
                .toList();
    }
}