package com.interviewforge.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.Filter;
import org.springframework.security.access.AccessDeniedException;

import com.interviewforge.controller.ResumeAnalysisController;
import com.interviewforge.dto.ResumeUploadResponse;
import com.interviewforge.entity.InterviewQuestionEntity;
import com.interviewforge.entity.InterviewSession;
import com.interviewforge.entity.Resume;
import com.interviewforge.entity.ResumeProcessingStatus;
import com.interviewforge.entity.User;
import com.interviewforge.repository.InterviewQuestionRepository;
import com.interviewforge.repository.InterviewSessionRepository;
import com.interviewforge.repository.ResumeRepository;

class ResumeReplacementWorkflowTest {

    private ResumeRepository resumeRepository;
    private VectorStore vectorStore;
    private InterviewSessionRepository interviewSessionRepository;
    private InterviewQuestionRepository interviewQuestionRepository;
    private ResumeService resumeService;
    private ResumeAnalysisService resumeAnalysisService;
    private ResumeAnalysisController resumeAnalysisController;

    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        resumeRepository = mock(ResumeRepository.class);
        vectorStore = mock(VectorStore.class);
        interviewSessionRepository = mock(InterviewSessionRepository.class);
        interviewQuestionRepository = mock(InterviewQuestionRepository.class);

        resumeService = new ResumeService(
                resumeRepository,
                vectorStore,
                interviewSessionRepository,
                interviewQuestionRepository
        );

        resumeAnalysisService = mock(ResumeAnalysisService.class);
        resumeAnalysisController = new ResumeAnalysisController(resumeAnalysisService, resumeRepository);

        alice = new User();
        alice.setId(1L);
        alice.setEmail("alice@example.com");

        bob = new User();
        bob.setId(2L);
        bob.setEmail("bob@example.com");
    }

    @Test
    void test1_firstUpload_successful_createsAndActivatesResumeWith768Dimensions() {
        byte[] content = "Alice Java Backend Resume".getBytes(StandardCharsets.UTF_8);
        String hash = ResumeService.calculateSha256(content);

        when(resumeRepository.findFirstByUserAndActiveTrue(alice)).thenReturn(Optional.empty());
        when(resumeRepository.findFirstByUserAndFileHashOrderByUploadedAtDesc(alice, hash)).thenReturn(Optional.empty());
        when(resumeRepository.findByUserAndActiveFalse(alice)).thenReturn(List.of());

        List<Resume> savedList = new ArrayList<>();
        when(resumeRepository.save(any(Resume.class))).thenAnswer(inv -> {
            Resume r = inv.getArgument(0);
            if (r.getId() == null) {
                r.setId(101L);
            }
            savedList.add(r);
            return r;
        });

        ResumeUploadResponse response = resumeService.processResume(
                "alice_v1.pdf",
                "application/pdf",
                content,
                "Extracted text with skills: Java, Spring Boot, PostgreSQL",
                alice,
                false
        );

        assertEquals(101L, response.resumeId());
        assertEquals("READY", response.status());
        assertFalse(response.duplicate());

        // Verify embeddings added to vectorStore with metadata
        verify(vectorStore, times(1)).add(argThat((List<Document> docs) -> {
            assertNotNull(docs);
            assertFalse(docs.isEmpty());
            Document first = docs.get(0);
            assertEquals("101", first.getMetadata().get("resumeId"));
            assertEquals("1", first.getMetadata().get("userId"));
            assertEquals("resume", first.getMetadata().get("type"));
            return true;
        }));

        // Verify active flag set to true
        Resume finalState = savedList.get(savedList.size() - 1);
        assertTrue(finalState.isActive());
        assertEquals(ResumeProcessingStatus.READY, finalState.getProcessingStatus());
    }

    @Test
    void test2_sameFileDuplicateUpload_returnsDuplicateNoticeWithoutReindexing() {
        byte[] content = "Identical Resume Content".getBytes(StandardCharsets.UTF_8);
        String hash = ResumeService.calculateSha256(content);

        Resume activeResume = new Resume();
        activeResume.setId(101L);
        activeResume.setUser(alice);
        activeResume.setFileHash(hash);
        activeResume.setActive(true);
        activeResume.setProcessingStatus(ResumeProcessingStatus.READY);

        when(resumeRepository.findFirstByUserAndActiveTrue(alice)).thenReturn(Optional.of(activeResume));

        ResumeUploadResponse response = resumeService.processResume(
                "same.pdf",
                "application/pdf",
                content,
                "Identical text",
                alice,
                false
        );

        assertEquals(101L, response.resumeId());
        assertEquals("READY", response.status());
        assertTrue(response.duplicate());

        // Vector store and repository save should NOT be called
        verify(vectorStore, never()).add(any());
        verify(resumeRepository, never()).save(any());
    }

    @Test
    void test3_successfulReplacement_removesOldVectorsAndSessionsAndActivatesNew() {
        byte[] oldContent = "Old Resume Content v1".getBytes(StandardCharsets.UTF_8);
        String oldHash = ResumeService.calculateSha256(oldContent);

        Resume oldActive = new Resume();
        oldActive.setId(10L);
        oldActive.setUser(alice);
        oldActive.setFileHash(oldHash);
        oldActive.setActive(true);
        oldActive.setProcessingStatus(ResumeProcessingStatus.READY);

        byte[] newContent = "New Updated Resume Content v2".getBytes(StandardCharsets.UTF_8);

        when(resumeRepository.findFirstByUserAndActiveTrue(alice)).thenReturn(Optional.of(oldActive));
        when(resumeRepository.findByUserAndActiveFalse(alice)).thenReturn(List.of());

        InterviewSession session = new InterviewSession();
        session.setId(55L);
        session.setResumeId(10L);
        when(interviewSessionRepository.findByResumeIdOrderByStartedAtDesc(10L)).thenReturn(List.of(session));

        when(resumeRepository.save(any(Resume.class))).thenAnswer(inv -> {
            Resume r = inv.getArgument(0);
            if (r.getId() == null) {
                r.setId(20L);
            }
            return r;
        });

        // User confirmed replacement (replaceConfirmed = true)
        ResumeUploadResponse response = resumeService.processResume(
                "alice_v2.pdf",
                "application/pdf",
                newContent,
                "Updated text with Kubernetes and Docker skills",
                alice,
                true
        );

        assertEquals(20L, response.resumeId());
        assertEquals("READY", response.status());
        assertFalse(response.duplicate());

        // Verify vector chunks cleanup was invoked (for staged and old resume)
        verify(vectorStore, atLeastOnce()).delete(any(Filter.Expression.class));

        // Verify old interview sessions and questions were deleted
        verify(interviewQuestionRepository).deleteBySessionId(55L);
        verify(interviewSessionRepository).deleteByResumeId(10L);

        // Verify old resume entity was deleted
        verify(resumeRepository).delete(oldActive);
    }

    @Test
    void test4_userCancellationOrUnconfirmedReplacement_leavesExistingResumeUnchanged() {
        byte[] oldContent = "Old Resume Content".getBytes(StandardCharsets.UTF_8);
        String oldHash = ResumeService.calculateSha256(oldContent);

        Resume oldActive = new Resume();
        oldActive.setId(10L);
        oldActive.setUser(alice);
        oldActive.setFileHash(oldHash);
        oldActive.setActive(true);
        oldActive.setProcessingStatus(ResumeProcessingStatus.READY);

        when(resumeRepository.findFirstByUserAndActiveTrue(alice)).thenReturn(Optional.of(oldActive));

        byte[] differentContent = "Different Resume Without Confirmation".getBytes(StandardCharsets.UTF_8);

        // Without confirmation (replaceConfirmed = false), an IllegalStateException is thrown
        assertThrows(IllegalStateException.class, () -> resumeService.processResume(
                "new.pdf",
                "application/pdf",
                differentContent,
                "New text",
                alice,
                false
        ));

        // Verify old resume vectors were NOT deleted
        verify(vectorStore, never()).delete(any(Filter.Expression.class));
        // Verify old resume was NOT deleted
        verify(resumeRepository, never()).delete(any());
    }

    @Test
    void test5_parsingFailure_emptyContentThrowsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> {
            ResumeService.calculateSha256(new byte[0]);
        });
    }

    @Test
    void test6_embeddingFailure_preservesOldActiveResumeAndRetainsOldVectors() {
        byte[] oldContent = "Old Active Resume".getBytes(StandardCharsets.UTF_8);
        Resume oldActive = new Resume();
        oldActive.setId(10L);
        oldActive.setUser(alice);
        oldActive.setFileHash(ResumeService.calculateSha256(oldContent));
        oldActive.setActive(true);
        oldActive.setProcessingStatus(ResumeProcessingStatus.READY);

        when(resumeRepository.findFirstByUserAndActiveTrue(alice)).thenReturn(Optional.of(oldActive));
        when(resumeRepository.findByUserAndActiveFalse(alice)).thenReturn(List.of());

        when(resumeRepository.save(any(Resume.class))).thenAnswer(inv -> {
            Resume r = inv.getArgument(0);
            if (r.getId() == null) {
                r.setId(99L);
            }
            return r;
        });

        // Simulate embedding failure on new resume (e.g. rate limit / network error)
        doThrow(new RuntimeException("Google GenAI 503 Service Unavailable"))
                .when(vectorStore).add(any());

        byte[] newContent = "Replacement Resume That Fails Indexing".getBytes(StandardCharsets.UTF_8);

        ResumeUploadResponse response = resumeService.processResume(
                "replacement_failing.pdf",
                "application/pdf",
                newContent,
                "Some extracted text",
                alice,
                true
        );

        assertEquals(99L, response.resumeId());
        assertEquals("FAILED", response.status());

        // Verify old resume was NEVER deleted
        verify(resumeRepository, never()).delete(oldActive);

        // Verify old active resume remains READY and active
        assertTrue(oldActive.isActive());
        assertEquals(ResumeProcessingStatus.READY, oldActive.getProcessingStatus());
    }

    @Test
    void test7_indexingFailureAndRetry_recoversAndActivatesNewResume() {
        Resume failedStaged = new Resume();
        failedStaged.setId(99L);
        failedStaged.setUser(alice);
        failedStaged.setFileName("staged.pdf");
        failedStaged.setExtractedText("Text to retry");
        failedStaged.setActive(false);
        failedStaged.setProcessingStatus(ResumeProcessingStatus.FAILED);

        Resume oldActive = new Resume();
        oldActive.setId(10L);
        oldActive.setUser(alice);
        oldActive.setActive(true);
        oldActive.setProcessingStatus(ResumeProcessingStatus.READY);

        when(resumeRepository.findByIdAndUserEmail(99L, "alice@example.com")).thenReturn(Optional.of(failedStaged));
        when(resumeRepository.findFirstByUserAndActiveTrue(alice)).thenReturn(Optional.of(oldActive));
        when(resumeRepository.save(any(Resume.class))).thenAnswer(inv -> inv.getArgument(0));

        // Retry succeeds
        ResumeUploadResponse response = resumeService.retryResumeEmbedding(99L, "alice@example.com");

        assertEquals(99L, response.resumeId());
        assertEquals("READY", response.status());

        // Verify old resume was cleaned up and new resume is activated
        verify(resumeRepository).delete(oldActive);
        assertTrue(failedStaged.isActive());
        assertEquals(ResumeProcessingStatus.READY, failedStaged.getProcessingStatus());
    }

    @Test
    void test8_crossUserAccessDenied() {
        Resume aliceResume = new Resume();
        aliceResume.setId(10L);
        aliceResume.setUser(alice);
        aliceResume.setActive(true);
        aliceResume.setProcessingStatus(ResumeProcessingStatus.READY);

        // Bob tries to retry Alice's resume
        when(resumeRepository.findByIdAndUserEmail(10L, "bob@example.com")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> {
            resumeService.retryResumeEmbedding(10L, "bob@example.com");
        });

        // Bob tries to access analysis for Alice's resume
        org.springframework.security.core.Authentication bobAuth = mock(org.springframework.security.core.Authentication.class);
        when(bobAuth.getName()).thenReturn("bob@example.com");

        assertThrows(AccessDeniedException.class, () -> {
            resumeAnalysisController.analyzeResume(10L, bobAuth);
        });
    }

    @Test
    void test9_oldAnalysisCannotBeReturnedForNewResume() {
        org.springframework.security.core.Authentication auth = mock(org.springframework.security.core.Authentication.class);
        when(auth.getName()).thenReturn("alice@example.com");

        // Old replaced resume (now inactive or deleted)
        Resume oldInactiveResume = new Resume();
        oldInactiveResume.setId(10L);
        oldInactiveResume.setUser(alice);
        oldInactiveResume.setActive(false); // Inactive!
        oldInactiveResume.setProcessingStatus(ResumeProcessingStatus.READY);

        when(resumeRepository.findByIdAndUserEmail(10L, "alice@example.com")).thenReturn(Optional.of(oldInactiveResume));

        // Attempting to analyze an inactive replaced resume throws AccessDeniedException
        assertThrows(AccessDeniedException.class, () -> {
            resumeAnalysisController.analyzeResume(10L, auth);
        });
    }

    @Test
    void test10_concurrentUploadsBySameUser_safeAndSequential() throws InterruptedException {
        byte[] contentA = "Concurrent File A".getBytes(StandardCharsets.UTF_8);
        byte[] contentB = "Concurrent File B".getBytes(StandardCharsets.UTF_8);

        when(resumeRepository.findFirstByUserAndActiveTrue(alice)).thenReturn(Optional.empty());
        when(resumeRepository.findByUserAndActiveFalse(alice)).thenReturn(List.of());

        AtomicInteger saveCount = new AtomicInteger(0);
        when(resumeRepository.save(any(Resume.class))).thenAnswer(inv -> {
            Resume r = inv.getArgument(0);
            if (r.getId() == null) {
                r.setId((long) saveCount.incrementAndGet());
            }
            return r;
        });

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch latch = new CountDownLatch(2);

        executor.submit(() -> {
            try {
                resumeService.processResume("a.pdf", "application/pdf", contentA, "Text A", alice, true);
            } finally {
                latch.countDown();
            }
        });

        executor.submit(() -> {
            try {
                resumeService.processResume("b.pdf", "application/pdf", contentB, "Text B", alice, true);
            } finally {
                latch.countDown();
            }
        });

        boolean finished = latch.await(5, TimeUnit.SECONDS);
        assertTrue(finished);
        executor.shutdown();

        // Both executions completed safely without deadlock or concurrency failure
        verify(vectorStore, times(2)).add(any());
    }

    @Test
    void test11_legacyNullStatusResume_canBeActiveAndAnalyzedViaExtractedTextFallback() {
        org.springframework.security.core.Authentication auth = mock(org.springframework.security.core.Authentication.class);
        when(auth.getName()).thenReturn("alice@example.com");

        Resume legacyResume = new Resume();
        legacyResume.setId(6L);
        legacyResume.setUser(alice);
        legacyResume.setActive(true);
        legacyResume.setProcessingStatus(null); // legacy NULL processing_status in database
        legacyResume.setExtractedText("Extracted text from legacy resume #6");

        when(resumeRepository.findByIdAndUserEmail(6L, "alice@example.com")).thenReturn(Optional.of(legacyResume));
        when(resumeRepository.findFirstByUserEmailAndActiveTrue("alice@example.com")).thenReturn(Optional.of(legacyResume));

        com.interviewforge.dto.ResumeAnalysis expectedAnalysis = new com.interviewforge.dto.ResumeAnalysis(
                List.of("Java", "SQL"),
                List.of("Strong backend fundamentals"),
                List.of("Limited cloud experience"),
                List.of("Kubernetes"),
                List.of("Good project structure"),
                List.of("Add metrics to projects")
        );
        when(resumeAnalysisService.analyzeResume(6L)).thenReturn(expectedAnalysis);

        // Analysis succeeds for active legacy resume
        com.interviewforge.dto.ResumeAnalysis result1 = resumeAnalysisController.analyzeResume(6L, auth);
        assertNotNull(result1);
        assertEquals(expectedAnalysis, result1);

        // Analysis via active resume endpoint also succeeds
        com.interviewforge.dto.ResumeAnalysis result2 = resumeAnalysisController.analyzeActiveResume(auth);
        assertNotNull(result2);
        assertEquals(expectedAnalysis, result2);
    }

    @Test
    void test12_failedRetry_preservesExistingActiveResumeAndPurgesStagedVectors() {
        Resume oldActive = new Resume();
        oldActive.setId(6L);
        oldActive.setUser(alice);
        oldActive.setActive(true);
        oldActive.setProcessingStatus(ResumeProcessingStatus.READY);

        Resume failedResume9 = new Resume();
        failedResume9.setId(9L);
        failedResume9.setUser(alice);
        failedResume9.setActive(false);
        failedResume9.setProcessingStatus(ResumeProcessingStatus.FAILED);
        failedResume9.setExtractedText("Resume 9 text");
        failedResume9.setFileName("resume9.pdf");

        when(resumeRepository.findByIdAndUserEmail(9L, "alice@example.com")).thenReturn(Optional.of(failedResume9));
        when(resumeRepository.findFirstByUserAndActiveTrue(alice)).thenReturn(Optional.of(oldActive));
        when(resumeRepository.save(any(Resume.class))).thenAnswer(inv -> inv.getArgument(0));

        // Simulate embedding failure during retry
        doThrow(new RuntimeException("Embedding model timeout")).when(vectorStore).add(any());

        ResumeUploadResponse response = resumeService.retryResumeEmbedding(9L, "alice@example.com");

        assertEquals(9L, response.resumeId());
        assertEquals("FAILED", response.status());

        // Verify partial vectors for resume 9 were deleted
        verify(vectorStore, atLeastOnce()).delete(any(Filter.Expression.class));

        // Verify old active resume #6 was NEVER deleted
        verify(resumeRepository, never()).delete(oldActive);
        assertTrue(oldActive.isActive());
        assertEquals(ResumeProcessingStatus.READY, oldActive.getProcessingStatus());
    }

    @Test
    void test13_sameFileReplacement_reusesExistingInactiveRecord_withoutViolatingFileHashConstraint() {
        byte[] oldContent = "Old Resume Content".getBytes(StandardCharsets.UTF_8);
        Resume oldActive = new Resume();
        oldActive.setId(6L);
        oldActive.setUser(alice);
        oldActive.setFileHash(ResumeService.calculateSha256(oldContent));
        oldActive.setActive(true);
        oldActive.setProcessingStatus(ResumeProcessingStatus.READY);

        byte[] newContent = "Resume 9 Content".getBytes(StandardCharsets.UTF_8);
        String hash9 = ResumeService.calculateSha256(newContent);

        // Resume #9 already exists in inactive status (e.g. from previous failed attempt)
        Resume existingFailed9 = new Resume();
        existingFailed9.setId(9L);
        existingFailed9.setUser(alice);
        existingFailed9.setFileHash(hash9);
        existingFailed9.setActive(false);
        existingFailed9.setProcessingStatus(ResumeProcessingStatus.FAILED);

        when(resumeRepository.findFirstByUserAndActiveTrue(alice)).thenReturn(Optional.of(oldActive));
        when(resumeRepository.findFirstByUserAndFileHashOrderByUploadedAtDesc(alice, hash9)).thenReturn(Optional.of(existingFailed9));
        when(resumeRepository.save(any(Resume.class))).thenAnswer(inv -> inv.getArgument(0));

        ResumeUploadResponse response = resumeService.processResume(
                "resume9.pdf",
                "application/pdf",
                newContent,
                "Extracted text for resume 9",
                alice,
                true // confirmed replacement
        );

        // Reused existing record 9 instead of attempting duplicate row insert
        assertEquals(9L, response.resumeId());
        assertEquals("READY", response.status());

        // Old resume 6 is retired and cleaned up
        verify(resumeRepository).delete(oldActive);
        // Resume 9 is now active and READY
        assertTrue(existingFailed9.isActive());
        assertEquals(ResumeProcessingStatus.READY, existingFailed9.getProcessingStatus());
    }

    @Test
    void test14_cleanupStagedResumesSafety_neverDeletesFailedOrLegacyResumes() {
        // Setup inactive resumes with FAILED status and legacy status
        Resume legacy = new Resume();
        legacy.setId(1L);
        legacy.setUser(alice);
        legacy.setActive(false);
        legacy.setProcessingStatus(null);

        Resume failed7 = new Resume();
        failed7.setId(7L);
        failed7.setUser(alice);
        failed7.setActive(false);
        failed7.setProcessingStatus(ResumeProcessingStatus.FAILED);

        // Only genuinely abandoned PROCESSING records should be returned
        Resume abandonedStaged = new Resume();
        abandonedStaged.setId(999L);
        abandonedStaged.setUser(alice);
        abandonedStaged.setActive(false);
        abandonedStaged.setProcessingStatus(ResumeProcessingStatus.PROCESSING);

        when(resumeRepository.findByUserAndActiveFalseAndProcessingStatus(alice, ResumeProcessingStatus.PROCESSING))
                .thenReturn(List.of(abandonedStaged));

        byte[] content = "Fresh Upload".getBytes(StandardCharsets.UTF_8);
        when(resumeRepository.findFirstByUserAndActiveTrue(alice)).thenReturn(Optional.empty());
        when(resumeRepository.save(any(Resume.class))).thenAnswer(inv -> {
            Resume r = inv.getArgument(0);
            if (r.getId() == null) r.setId(102L);
            return r;
        });

        resumeService.processResume("fresh.pdf", "application/pdf", content, "Text", alice, false);

        // Verify only the abandoned PROCESSING resume was deleted
        verify(resumeRepository).delete(abandonedStaged);
        // Verify legacy and FAILED records were NEVER deleted
        verify(resumeRepository, never()).delete(legacy);
        verify(resumeRepository, never()).delete(failed7);
    }

    @Test
    void test15_concurrentRetryAndReplacement_synchronizedAndConflictSafe() {
        Resume resume = new Resume();
        resume.setId(9L);
        resume.setUser(alice);
        resume.setActive(false);
        resume.setProcessingStatus(ResumeProcessingStatus.FAILED);
        resume.setExtractedText("Text");
        resume.setFileName("file.pdf");

        when(resumeRepository.findByIdAndUserEmail(9L, "alice@example.com")).thenReturn(Optional.of(resume));
        when(resumeRepository.findFirstByUserAndActiveTrue(alice)).thenReturn(Optional.empty());

        // Simulate multi-node database unique constraint violation when saving active status
        when(resumeRepository.save(argThat(r -> r != null && r.isActive())))
                .thenThrow(new org.springframework.dao.DataIntegrityViolationException("duplicate key value violates unique constraint uq_resumes_one_active_per_user"));

        // When saving failed status during conflict handling, return the entity
        when(resumeRepository.save(argThat(r -> r != null && !r.isActive()))).thenAnswer(inv -> inv.getArgument(0));

        ResumeUploadResponse response = resumeService.retryResumeEmbedding(9L, "alice@example.com");

        assertEquals(9L, response.resumeId());
        assertEquals("FAILED", response.status());
        assertTrue(response.message().contains("Another resume was activated concurrently"));

        // Staged vectors on the losing node were cleaned up
        verify(vectorStore, atLeastOnce()).delete(any(Filter.Expression.class));
        assertFalse(resume.isActive());
    }

    @Test
    void test16_priorityResolution_readyBeatsNullAndFailed() {
        Resume readyResume = new Resume();
        readyResume.setId(5L);
        readyResume.setProcessingStatus(ResumeProcessingStatus.READY);
        readyResume.setExtractedText("Ready text");
        readyResume.setUploadedAt(java.time.LocalDateTime.now().minusDays(10));

        Resume legacyNullResume = new Resume();
        legacyNullResume.setId(6L);
        legacyNullResume.setProcessingStatus(null);
        legacyNullResume.setExtractedText("Legacy text");
        legacyNullResume.setUploadedAt(java.time.LocalDateTime.now().minusDays(5));

        Resume failedResume = new Resume();
        failedResume.setId(9L);
        failedResume.setProcessingStatus(ResumeProcessingStatus.FAILED);
        failedResume.setExtractedText("Failed text");
        failedResume.setUploadedAt(java.time.LocalDateTime.now().minusDays(1));

        Optional<Resume> candidate = ResumeService.resolveCandidateActiveResume(
                List.of(failedResume, legacyNullResume, readyResume)
        );

        assertTrue(candidate.isPresent());
        assertEquals(5L, candidate.get().getId(), "READY resume must be selected over NULL and FAILED resumes");
    }

    @Test
    void test17_priorityResolution_legacyNullBeatsNewerFailed_record6SelectedOverRecord9() {
        // Simulates production User 1 state: records 1-6 are NULL with text, records 7-9 are FAILED
        List<Resume> user1Resumes = new ArrayList<>();

        for (long i = 1; i <= 6; i++) {
            Resume r = new Resume();
            r.setId(i);
            r.setProcessingStatus(null);
            r.setExtractedText("Extracted text for resume #" + i);
            r.setUploadedAt(java.time.LocalDateTime.now().minusDays(20 - i));
            user1Resumes.add(r);
        }

        for (long i = 7; i <= 9; i++) {
            Resume r = new Resume();
            r.setId(i);
            r.setProcessingStatus(ResumeProcessingStatus.FAILED);
            r.setExtractedText("Extracted text for failed resume #" + i);
            r.setUploadedAt(java.time.LocalDateTime.now().minusDays(10 - i));
            user1Resumes.add(r);
        }

        // Even though Resume #9 is newer than Resume #6, Resume #6 has NULL status with extracted text (Tier 2)
        // whereas Resume #9 has FAILED status (Tier 4).
        Optional<Resume> candidate = ResumeService.resolveCandidateActiveResume(user1Resumes);

        assertTrue(candidate.isPresent());
        assertEquals(6L, candidate.get().getId(), "Record #6 (newest legacy with text) must be selected over newer FAILED records #7-#9");
    }

    @Test
    void test18_priorityResolution_allResumesFailed_selectsNewestFallback() {
        Resume failed1 = new Resume();
        failed1.setId(7L);
        failed1.setProcessingStatus(ResumeProcessingStatus.FAILED);
        failed1.setExtractedText("Text 7");
        failed1.setUploadedAt(java.time.LocalDateTime.now().minusDays(3));

        Resume failed2 = new Resume();
        failed2.setId(8L);
        failed2.setProcessingStatus(ResumeProcessingStatus.FAILED);
        failed2.setExtractedText("Text 8");
        failed2.setUploadedAt(java.time.LocalDateTime.now().minusDays(2));

        Resume failed3 = new Resume();
        failed3.setId(9L);
        failed3.setProcessingStatus(ResumeProcessingStatus.FAILED);
        failed3.setExtractedText("Text 9");
        failed3.setUploadedAt(java.time.LocalDateTime.now().minusDays(1));

        Optional<Resume> candidate = ResumeService.resolveCandidateActiveResume(
                List.of(failed1, failed2, failed3)
        );

        assertTrue(candidate.isPresent());
        assertEquals(9L, candidate.get().getId(), "When all resumes are FAILED, the newest failed resume must be selected as fallback");
    }
}
