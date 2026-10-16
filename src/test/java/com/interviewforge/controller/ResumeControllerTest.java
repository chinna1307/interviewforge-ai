package com.interviewforge.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;

import com.interviewforge.dto.ResumeUploadResponse;
import com.interviewforge.entity.Resume;
import com.interviewforge.entity.User;
import com.interviewforge.repository.UserRepository;
import com.interviewforge.service.ResumeService;

class ResumeControllerTest {

    private ResumeService resumeService;
    private UserRepository userRepository;
    private ResumeController resumeController;

    @BeforeEach
    void setUp() {
        resumeService = mock(ResumeService.class);
        userRepository = mock(UserRepository.class);
        resumeController = new ResumeController(resumeService, userRepository);
    }

    @Test
    void uploadResume_successfulUpload_returnsResumeUploadResponseWithResumeId() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "resume.pdf",
                "application/pdf",
                "Sample resume content with technical skills Java Spring Boot".getBytes()
        );

        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("test@example.com");

        User user = new User();
        user.setId(10L);
        user.setEmail("test@example.com");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));

        Resume savedResume = new Resume();
        savedResume.setId(42L);
        savedResume.setFileName("resume.pdf");
        savedResume.setUser(user);

        when(resumeService.saveResume(eq("resume.pdf"), eq("application/pdf"), any(), eq(user)))
                .thenReturn(savedResume);

        ResponseEntity<?> response = resumeController.uploadResume(file, auth);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody() instanceof ResumeUploadResponse);

        ResumeUploadResponse body = (ResumeUploadResponse) response.getBody();
        assertEquals("Resume uploaded and text extracted successfully!", body.message());
        assertEquals(42L, body.resumeId());
    }

    @Test
    void uploadResume_emptyFile_returnsBadRequest() throws Exception {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file",
                "empty.pdf",
                "application/pdf",
                new byte[0]
        );

        Authentication auth = mock(Authentication.class);

        ResponseEntity<?> response = resumeController.uploadResume(emptyFile, auth);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Please select a resume file", response.getBody());
    }
}
