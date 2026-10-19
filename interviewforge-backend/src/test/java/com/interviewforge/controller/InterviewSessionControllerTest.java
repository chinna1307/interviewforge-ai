package com.interviewforge.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

import com.interviewforge.entity.InterviewSession;
import com.interviewforge.repository.InterviewQuestionRepository;
import com.interviewforge.service.InterviewSessionService;

class InterviewSessionControllerTest {

    private InterviewSessionService interviewSessionService;
    private InterviewQuestionRepository interviewQuestionRepository;
    private InterviewSessionController controller;

    @BeforeEach
    void setUp() {
        interviewSessionService = mock(InterviewSessionService.class);
        interviewQuestionRepository = mock(InterviewQuestionRepository.class);
        controller = new InterviewSessionController(interviewSessionService, interviewQuestionRepository);
    }

    @Test
    void startInterview_activeAndReadyResume_verifiesAndStartsSession() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("alice@example.com");

        InterviewSession createdSession = new InterviewSession();
        createdSession.setId(101L);
        createdSession.setResumeId(12L);

        when(interviewSessionService.startInterview(12L)).thenReturn(createdSession);

        InterviewSession result = controller.startInterview(12L, auth);

        assertNotNull(result);
        assertEquals(101L, result.getId());
        verify(interviewSessionService).verifyActiveReadyResumeOwnership(12L, "alice@example.com");
        verify(interviewSessionService).startInterview(12L);
    }

    @Test
    void startInterview_inactiveResume_propagatesAccessDeniedException() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("alice@example.com");

        doThrow(new AccessDeniedException("Only the active resume can be used to start a mock interview."))
                .when(interviewSessionService).verifyActiveReadyResumeOwnership(5L, "alice@example.com");

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                controller.startInterview(5L, auth));
        assertEquals("Only the active resume can be used to start a mock interview.", ex.getMessage());
    }

    @Test
    void startInterview_otherUserResume_propagatesAccessDeniedException() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("bob@example.com");

        doThrow(new AccessDeniedException("Resume not found or access denied."))
                .when(interviewSessionService).verifyActiveReadyResumeOwnership(12L, "bob@example.com");

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                controller.startInterview(12L, auth));
        assertEquals("Resume not found or access denied.", ex.getMessage());
    }

    @Test
    void getSession_unauthenticated_throwsAccessDeniedException() {
        doThrow(new AccessDeniedException("Authentication required."))
                .when(interviewSessionService).verifySessionOwnership(101L, null);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                controller.getSession(101L, null));
        assertEquals("Authentication required.", ex.getMessage());
    }

    @Test
    void getSession_authenticated_returnsSession() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("alice@example.com");

        InterviewSession session = new InterviewSession();
        session.setId(101L);

        when(interviewSessionService.verifySessionOwnership(101L, "alice@example.com")).thenReturn(session);

        InterviewSession result = controller.getSession(101L, auth);
        assertNotNull(result);
        assertEquals(101L, result.getId());
    }

    @Test
    void getInterviewResult_unauthenticated_throwsAccessDeniedException() {
        doThrow(new AccessDeniedException("Authentication required."))
                .when(interviewSessionService).verifySessionOwnership(101L, null);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                controller.getInterviewResult(101L, null));
        assertEquals("Authentication required.", ex.getMessage());
    }

    @Test
    void getQuestions_unauthenticated_throwsAccessDeniedException() {
        doThrow(new AccessDeniedException("Authentication required."))
                .when(interviewSessionService).verifySessionOwnership(101L, null);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                controller.getQuestions(101L, null));
        assertEquals("Authentication required.", ex.getMessage());
    }

    @Test
    void getHistory_unauthenticated_throwsAccessDeniedException() {
        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                controller.getHistory(null));
        assertEquals("Authentication required.", ex.getMessage());
    }
}
