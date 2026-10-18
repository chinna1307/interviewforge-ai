package com.interviewforge.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.vectorstore.VectorStore;

import com.interviewforge.dto.ResumeUploadResponse;
import com.interviewforge.entity.Resume;
import com.interviewforge.entity.ResumeProcessingStatus;
import com.interviewforge.entity.User;
import com.interviewforge.repository.ResumeRepository;

class ResumeServiceTest {

    private ResumeRepository resumeRepository;
    private VectorStore vectorStore;
    private ResumeService resumeService;

    private User user1;
    private User user2;

    @BeforeEach
    void setUp() {
        resumeRepository = mock(ResumeRepository.class);
        vectorStore = mock(VectorStore.class);
        resumeService = new ResumeService(resumeRepository, vectorStore);

        user1 = new User();
        user1.setId(1L);
        user1.setEmail("alice@example.com");

        user2 = new User();
        user2.setId(2L);
        user2.setEmail("bob@example.com");
    }

    @Test
    void testNewResumeUpload_success_persistsReadyStatusAndEmbeds() {
        byte[] fileBytes = "Unique Resume Content Alice".getBytes(StandardCharsets.UTF_8);
        String hash = ResumeService.calculateSha256(fileBytes);

        when(resumeRepository.findFirstByUserAndFileHashOrderByUploadedAtDesc(user1, hash))
                .thenReturn(Optional.empty());

        when(resumeRepository.save(any(Resume.class))).thenAnswer(invocation -> {
            Resume r = invocation.getArgument(0);
            if (r.getId() == null) {
                r.setId(101L);
            }
            return r;
        });

        ResumeUploadResponse response = resumeService.processResume(
                "alice_resume.pdf",
                "application/pdf",
                fileBytes,
                "Extracted text for Alice",
                user1
        );

        assertEquals(101L, response.resumeId());
        assertEquals("READY", response.status());
        assertFalse(response.duplicate());
        verify(vectorStore, times(1)).add(any());
    }

    @Test
    void testIdenticalFileUploadedAgainBySameUser_duplicateDetected_returnsExistingIdWithoutReEmbedding() {
        byte[] fileBytes = "Identical Resume Content".getBytes(StandardCharsets.UTF_8);
        String hash = ResumeService.calculateSha256(fileBytes);

        Resume existing = new Resume();
        existing.setId(42L);
        existing.setFileHash(hash);
        existing.setProcessingStatus(ResumeProcessingStatus.READY);
        existing.setUser(user1);

        when(resumeRepository.findFirstByUserAndFileHashOrderByUploadedAtDesc(user1, hash))
                .thenReturn(Optional.of(existing));

        ResumeUploadResponse response = resumeService.processResume(
                "same_file.pdf",
                "application/pdf",
                fileBytes,
                "Extracted text",
                user1
        );

        assertEquals(42L, response.resumeId());
        assertEquals("READY", response.status());
        assertTrue(response.duplicate());
        // Verify vector store ingestion was NOT repeated
        verify(vectorStore, never()).add(any());
        verify(resumeRepository, never()).save(any());
    }

    @Test
    void testSameFilenameDifferentContents_notDuplicate_savesBoth() {
        byte[] fileBytes1 = "First version of resume".getBytes(StandardCharsets.UTF_8);
        byte[] fileBytes2 = "Updated second version of resume".getBytes(StandardCharsets.UTF_8);

        String hash1 = ResumeService.calculateSha256(fileBytes1);
        String hash2 = ResumeService.calculateSha256(fileBytes2);

        when(resumeRepository.findFirstByUserAndFileHashOrderByUploadedAtDesc(user1, hash1))
                .thenReturn(Optional.empty());
        when(resumeRepository.findFirstByUserAndFileHashOrderByUploadedAtDesc(user1, hash2))
                .thenReturn(Optional.empty());

        when(resumeRepository.save(any(Resume.class))).thenAnswer(inv -> {
            Resume r = inv.getArgument(0);
            if (r.getId() == null) {
                r.setId(201L);
            }
            return r;
        });

        ResumeUploadResponse response = resumeService.processResume(
                "resume.pdf",
                "application/pdf",
                fileBytes2,
                "Updated text",
                user1
        );

        assertEquals(201L, response.resumeId());
        assertFalse(response.duplicate());
    }

    @Test
    void testDifferentUsersUploadingIdenticalFiles_notDuplicateAcrossUsers_scopedToUser() {
        byte[] fileBytes = "Shared Template Content".getBytes(StandardCharsets.UTF_8);
        String hash = ResumeService.calculateSha256(fileBytes);

        // User 1 has it
        Resume user1Resume = new Resume();
        user1Resume.setId(501L);
        user1Resume.setUser(user1);
        user1Resume.setFileHash(hash);
        user1Resume.setProcessingStatus(ResumeProcessingStatus.READY);

        // Query for user 2 returns empty (scoped)
        when(resumeRepository.findFirstByUserAndFileHashOrderByUploadedAtDesc(user2, hash))
                .thenReturn(Optional.empty());

        when(resumeRepository.save(any(Resume.class))).thenAnswer(inv -> {
            Resume r = inv.getArgument(0);
            if (r.getId() == null) {
                r.setId(502L);
            }
            return r;
        });

        ResumeUploadResponse responseUser2 = resumeService.processResume(
                "template.pdf",
                "application/pdf",
                fileBytes,
                "Shared text",
                user2
        );

        assertEquals(502L, responseUser2.resumeId());
        assertFalse(responseUser2.duplicate());
        verify(vectorStore, times(1)).add(any());
    }

    @Test
    void testEmbeddingFailure_marksResumeFailedAndStoresReason() {
        byte[] fileBytes = "Content that fails vector ingestion".getBytes(StandardCharsets.UTF_8);
        String hash = ResumeService.calculateSha256(fileBytes);

        when(resumeRepository.findFirstByUserAndFileHashOrderByUploadedAtDesc(user1, hash))
                .thenReturn(Optional.empty());

        when(resumeRepository.save(any(Resume.class))).thenAnswer(inv -> {
            Resume r = inv.getArgument(0);
            if (r.getId() == null) {
                r.setId(601L);
            }
            return r;
        });

        // Simulate vector store exception (e.g. rate limit or embedding network timeout)
        doThrow(new RuntimeException("Embedding model quota exceeded"))
                .when(vectorStore).add(any());

        ResumeUploadResponse response = resumeService.processResume(
                "failing.pdf",
                "application/pdf",
                fileBytes,
                "Extracted text",
                user1
        );

        assertEquals(601L, response.resumeId());
        assertEquals("FAILED", response.status());
        assertFalse(response.duplicate());

        // Verify status was saved as FAILED
        verify(resumeRepository, times(2)).save(argThat(r ->
                r.getProcessingStatus() == ResumeProcessingStatus.FAILED
                        && r.getFailureReason().contains("Embedding model quota exceeded")
        ));
    }

    @Test
    void testDuplicateUploadAfterPreviousProcessingFailure_retriesEmbedding() {
        byte[] fileBytes = "Resume that previously failed".getBytes(StandardCharsets.UTF_8);
        String hash = ResumeService.calculateSha256(fileBytes);

        Resume previouslyFailed = new Resume();
        previouslyFailed.setId(701L);
        previouslyFailed.setUser(user1);
        previouslyFailed.setFileHash(hash);
        previouslyFailed.setProcessingStatus(ResumeProcessingStatus.FAILED);
        previouslyFailed.setExtractedText("Extracted text");
        previouslyFailed.setFailureReason("Previous connection error");

        when(resumeRepository.findFirstByUserAndFileHashOrderByUploadedAtDesc(user1, hash))
                .thenReturn(Optional.of(previouslyFailed));

        when(resumeRepository.save(any(Resume.class))).thenAnswer(inv -> inv.getArgument(0));

        // This time vectorStore succeeds
        ResumeUploadResponse response = resumeService.processResume(
                "retry.pdf",
                "application/pdf",
                fileBytes,
                "Extracted text",
                user1
        );

        assertEquals(701L, response.resumeId());
        assertEquals("READY", response.status());
        assertTrue(response.duplicate());
        assertEquals(ResumeProcessingStatus.READY, previouslyFailed.getProcessingStatus());
        verify(vectorStore, times(1)).add(any());
    }

    @Test
    void testRetryResumeEmbedding_whenAlreadyReady_returnsReadyWithoutReembedding() {
        Resume readyResume = new Resume();
        readyResume.setId(801L);
        readyResume.setProcessingStatus(ResumeProcessingStatus.READY);

        when(resumeRepository.findByIdAndUserEmail(801L, "alice@example.com"))
                .thenReturn(Optional.of(readyResume));

        ResumeUploadResponse response = resumeService.retryResumeEmbedding(801L, "alice@example.com");

        assertEquals(801L, response.resumeId());
        assertEquals("READY", response.status());
        verify(vectorStore, never()).add(any());
    }

    @Test
    void testRetryResumeEmbedding_whenFailed_retriesAndTransitionsToReady() {
        Resume failedResume = new Resume();
        failedResume.setId(802L);
        failedResume.setUser(user1);
        failedResume.setExtractedText("Sample text");
        failedResume.setFileName("sample.pdf");
        failedResume.setProcessingStatus(ResumeProcessingStatus.FAILED);

        when(resumeRepository.findByIdAndUserEmail(802L, "alice@example.com"))
                .thenReturn(Optional.of(failedResume));
        when(resumeRepository.save(any(Resume.class))).thenAnswer(inv -> inv.getArgument(0));

        ResumeUploadResponse response = resumeService.retryResumeEmbedding(802L, "alice@example.com");

        assertEquals(802L, response.resumeId());
        assertEquals("READY", response.status());
        assertEquals(ResumeProcessingStatus.READY, failedResume.getProcessingStatus());
        verify(vectorStore, times(1)).add(any());
    }
}
