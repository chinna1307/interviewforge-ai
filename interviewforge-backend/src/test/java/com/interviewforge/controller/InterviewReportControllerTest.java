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

import com.interviewforge.dto.InterviewReport;
import com.interviewforge.service.InterviewReportService;
import com.interviewforge.service.InterviewSessionService;

class InterviewReportControllerTest {

    private InterviewReportService interviewReportService;
    private InterviewSessionService interviewSessionService;
    private InterviewReportController controller;

    @BeforeEach
    void setUp() {
        interviewReportService = mock(InterviewReportService.class);
        interviewSessionService = mock(InterviewSessionService.class);
        controller = new InterviewReportController(interviewReportService, interviewSessionService);
    }

    @Test
    void generateReport_authenticated_verifiesOwnershipAndReturnsReport() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("alice@example.com");

        InterviewReport mockReport = new InterviewReport(
                201L, 5, 5, 40, 8.0, "Strong fundamentals", java.util.List.of("Java"), java.util.List.of("Algorithms"), java.util.List.of("Practice system design"));
        when(interviewReportService.generateReport(201L)).thenReturn(mockReport);

        InterviewReport result = controller.generateReport(201L, auth);

        assertNotNull(result);
        assertEquals(201L, result.sessionId());
        verify(interviewSessionService).verifySessionOwnership(201L, "alice@example.com");
        verify(interviewReportService).generateReport(201L);
    }

    @Test
    void generateReport_unauthenticated_throwsAccessDeniedException() {
        doThrow(new AccessDeniedException("Authentication required."))
                .when(interviewSessionService).verifySessionOwnership(201L, null);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                controller.generateReport(201L, null));
        assertEquals("Authentication required.", ex.getMessage());
    }

    @Test
    void generateReport_otherUserSession_throwsAccessDeniedException() {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("attacker@example.com");

        doThrow(new AccessDeniedException("Resume not found or access denied."))
                .when(interviewSessionService).verifySessionOwnership(201L, "attacker@example.com");

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                controller.generateReport(201L, auth));
        assertEquals("Resume not found or access denied.", ex.getMessage());
    }
}
