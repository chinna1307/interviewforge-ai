package com.interviewforge.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import com.interviewforge.entity.InterviewSession;
import com.interviewforge.entity.Resume;
import com.interviewforge.entity.ResumeProcessingStatus;
import com.interviewforge.repository.InterviewQuestionRepository;
import com.interviewforge.repository.InterviewSessionRepository;
import com.interviewforge.repository.ResumeRepository;

class InterviewSessionValidationTest {

    private InterviewSessionRepository sessionRepository;
    private InterviewQuestionRepository questionRepository;
    private ResumeRepository resumeRepository;
    private MockInterviewService mockInterviewService;
    private InterviewSessionService sessionService;

    @BeforeEach
    void setUp() {
        sessionRepository = mock(InterviewSessionRepository.class);
        questionRepository = mock(InterviewQuestionRepository.class);
        resumeRepository = mock(ResumeRepository.class);
        mockInterviewService = mock(MockInterviewService.class);

        sessionService = new InterviewSessionService(
                sessionRepository, questionRepository, resumeRepository, mockInterviewService);
    }

    @Test
    void verifyActiveReadyResumeOwnership_nullOrBlankUserEmail_throwsAccessDeniedException() {
        AccessDeniedException ex1 = assertThrows(AccessDeniedException.class, () ->
                sessionService.verifyActiveReadyResumeOwnership(1L, null));
        assertEquals("Authentication required.", ex1.getMessage());

        AccessDeniedException ex2 = assertThrows(AccessDeniedException.class, () ->
                sessionService.verifyActiveReadyResumeOwnership(1L, "   "));
        assertEquals("Authentication required.", ex2.getMessage());
    }

    @Test
    void verifyActiveReadyResumeOwnership_resumeNotFoundOrBelongsToOtherUser_throwsAccessDeniedException() {
        when(resumeRepository.findByIdAndUserEmail(99L, "alice@example.com"))
                .thenReturn(Optional.empty());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                sessionService.verifyActiveReadyResumeOwnership(99L, "alice@example.com"));
        assertEquals("Resume not found or access denied.", ex.getMessage());
    }

    @Test
    void verifyActiveReadyResumeOwnership_inactiveResume_throwsAccessDeniedException() {
        Resume inactiveResume = new Resume();
        inactiveResume.setId(5L);
        inactiveResume.setActive(false);
        inactiveResume.setProcessingStatus(ResumeProcessingStatus.READY);

        when(resumeRepository.findByIdAndUserEmail(5L, "alice@example.com"))
                .thenReturn(Optional.of(inactiveResume));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                sessionService.verifyActiveReadyResumeOwnership(5L, "alice@example.com"));
        assertEquals("Only the active resume can be used to start a mock interview.", ex.getMessage());
    }

    @Test
    void verifyActiveReadyResumeOwnership_failedIndexingStatus_throwsAccessDeniedException() {
        Resume failedResume = new Resume();
        failedResume.setId(9L);
        failedResume.setActive(true);
        failedResume.setProcessingStatus(ResumeProcessingStatus.FAILED);

        when(resumeRepository.findByIdAndUserEmail(9L, "alice@example.com"))
                .thenReturn(Optional.of(failedResume));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                sessionService.verifyActiveReadyResumeOwnership(9L, "alice@example.com"));
        assertEquals("Resume is not ready for interview generation (status: FAILED). Please ensure indexing has completed successfully.", ex.getMessage());
    }

    @Test
    void verifyActiveReadyResumeOwnership_processingStatus_throwsAccessDeniedException() {
        Resume pendingResume = new Resume();
        pendingResume.setId(11L);
        pendingResume.setActive(true);
        pendingResume.setProcessingStatus(ResumeProcessingStatus.PROCESSING);

        when(resumeRepository.findByIdAndUserEmail(11L, "alice@example.com"))
                .thenReturn(Optional.of(pendingResume));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                sessionService.verifyActiveReadyResumeOwnership(11L, "alice@example.com"));
        assertEquals("Resume is not ready for interview generation (status: PROCESSING). Please ensure indexing has completed successfully.", ex.getMessage());
    }

    @Test
    void verifyActiveReadyResumeOwnership_nullStatus_throwsAccessDeniedException() {
        Resume pendingResume = new Resume();
        pendingResume.setId(13L);
        pendingResume.setActive(true);
        pendingResume.setProcessingStatus(null);

        when(resumeRepository.findByIdAndUserEmail(13L, "alice@example.com"))
                .thenReturn(Optional.of(pendingResume));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                sessionService.verifyActiveReadyResumeOwnership(13L, "alice@example.com"));
        assertEquals("Resume is not ready for interview generation (status: PENDING). Please ensure indexing has completed successfully.", ex.getMessage());
    }

    @Test
    void verifyActiveReadyResumeOwnership_activeAndReady_succeeds() {
        Resume readyResume = new Resume();
        readyResume.setId(12L);
        readyResume.setActive(true);
        readyResume.setProcessingStatus(ResumeProcessingStatus.READY);

        when(resumeRepository.findByIdAndUserEmail(12L, "alice@example.com"))
                .thenReturn(Optional.of(readyResume));

        Resume result = sessionService.verifyActiveReadyResumeOwnership(12L, "alice@example.com");
        assertNotNull(result);
        assertEquals(12L, result.getId());
    }

    @Test
    void verifySessionOwnership_historicalSessionWithInactiveResume_allowsAccess() {
        InterviewSession historicalSession = new InterviewSession();
        historicalSession.setId(500L);
        historicalSession.setResumeId(2L);
        historicalSession.setStatus("COMPLETED");
        historicalSession.setStartedAt(LocalDateTime.now().minusDays(3));

        Resume oldSupersededResume = new Resume();
        oldSupersededResume.setId(2L);
        oldSupersededResume.setActive(false); // superseded by a newer resume
        oldSupersededResume.setProcessingStatus(ResumeProcessingStatus.READY);

        when(sessionRepository.findById(500L)).thenReturn(Optional.of(historicalSession));
        when(resumeRepository.findByIdAndUserEmail(2L, "alice@example.com"))
                .thenReturn(Optional.of(oldSupersededResume));

        InterviewSession verified = sessionService.verifySessionOwnership(500L, "alice@example.com");
        assertNotNull(verified);
        assertEquals(500L, verified.getId());
    }

    @Test
    void verifySessionOwnership_sessionBelongingToDifferentUser_throwsAccessDeniedException() {
        InterviewSession session = new InterviewSession();
        session.setId(600L);
        session.setResumeId(3L);

        when(sessionRepository.findById(600L)).thenReturn(Optional.of(session));
        when(resumeRepository.findByIdAndUserEmail(3L, "attacker@example.com"))
                .thenReturn(Optional.empty());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                sessionService.verifySessionOwnership(600L, "attacker@example.com"));
        assertEquals("Resume not found or access denied.", ex.getMessage());
    }

    @Test
    void verifySessionOwnership_unauthenticatedNullOrBlankEmail_throwsAccessDeniedException() {
        InterviewSession session = new InterviewSession();
        session.setId(700L);
        session.setResumeId(4L);

        when(sessionRepository.findById(700L)).thenReturn(Optional.of(session));

        AccessDeniedException ex1 = assertThrows(AccessDeniedException.class, () ->
                sessionService.verifySessionOwnership(700L, null));
        assertEquals("Authentication required.", ex1.getMessage());

        AccessDeniedException ex2 = assertThrows(AccessDeniedException.class, () ->
                sessionService.verifySessionOwnership(700L, "   "));
        assertEquals("Authentication required.", ex2.getMessage());
    }
}
