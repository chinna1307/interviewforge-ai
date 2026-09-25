package com.interviewforge.controller;

import java.io.IOException;

import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.interviewforge.entity.User;
import com.interviewforge.repository.UserRepository;
import com.interviewforge.service.ResumeService;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    private final ResumeService resumeService;
    private final UserRepository userRepository;

    public ResumeController(
            ResumeService resumeService,
            UserRepository userRepository) {

        this.resumeService = resumeService;
        this.userRepository = userRepository;
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadResume(
            @RequestParam("file") MultipartFile file,
            Authentication authentication)
            throws IOException, TikaException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body("Please select a resume file");
        }

        Tika tika = new Tika();

        String extractedText = tika.parseToString(file.getInputStream());

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        resumeService.saveResume(
                file.getOriginalFilename(),
                file.getContentType(),
                extractedText,
                user
        );

        return ResponseEntity.ok(
                "Resume uploaded and text extracted successfully!"
        );
    }
}