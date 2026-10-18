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
import com.interviewforge.entity.User;
import com.interviewforge.repository.UserRepository;
import com.interviewforge.service.ResumeService;

class ResumeControllerTest {

    private ResumeService resumeService;
    private UserRepository userRepository;
    private ResumeController resumeController;

    private static final byte[] VALID_PDF_BYTES = ("%PDF-1.4\n"
            + "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            + "2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
            + "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]"
            + "/Contents 4 0 R>>endobj\n"
            + "4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 72 720 Td"
            + "(Java Spring Boot resume) Tj ET\nendstream endobj\n"
            + "trailer<</Root 1 0 R>>\n%%EOF").getBytes();

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
                VALID_PDF_BYTES
        );

        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("test@example.com");

        User user = new User();
        user.setId(10L);
        user.setEmail("test@example.com");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));

        when(resumeService.processResume(eq("resume.pdf"), any(), any(), any(), eq(user)))
                .thenReturn(new ResumeUploadResponse(
                        "Resume uploaded and text extracted successfully!",
                        42L,
                        "READY",
                        false
                ));

        ResponseEntity<?> response = resumeController.uploadResume(file, auth);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody() instanceof ResumeUploadResponse);

        ResumeUploadResponse body = (ResumeUploadResponse) response.getBody();
        assertEquals("Resume uploaded and text extracted successfully!", body.message());
        assertEquals(42L, body.resumeId());
        assertEquals("READY", body.status());
        assertEquals(false, body.duplicate());
    }

    @Test
    void uploadResume_duplicateUpload_returnsDuplicateStatusAndExistingId() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "resume.pdf",
                "application/pdf",
                VALID_PDF_BYTES
        );

        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("test@example.com");

        User user = new User();
        user.setId(10L);
        user.setEmail("test@example.com");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));

        when(resumeService.processResume(eq("resume.pdf"), any(), any(), any(), eq(user)))
                .thenReturn(new ResumeUploadResponse(
                        "You've already uploaded this resume. View your existing analysis or re-analyze it.",
                        42L,
                        "READY",
                        true
                ));

        ResponseEntity<?> response = resumeController.uploadResume(file, auth);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof ResumeUploadResponse);
        ResumeUploadResponse body = (ResumeUploadResponse) response.getBody();
        assertEquals(42L, body.resumeId());
        assertTrue(body.duplicate());
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

    @Test
    void retryResume_invokesServiceAndReturnsResponse() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("test@example.com");

        when(resumeService.retryResumeEmbedding(42L, "test@example.com"))
                .thenReturn(new ResumeUploadResponse("Embedding indexing succeeded!", 42L, "READY", false));

        ResponseEntity<ResumeUploadResponse> response = resumeController.retryResume(42L, auth);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("READY", response.getBody().status());
    }
}

