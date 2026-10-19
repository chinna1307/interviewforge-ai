package com.interviewforge.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.interviewforge.dto.InterviewReport;
import com.interviewforge.entity.InterviewQuestionEntity;
import com.interviewforge.entity.InterviewSession;
import com.interviewforge.repository.InterviewQuestionRepository;
import com.interviewforge.repository.InterviewSessionRepository;
import com.interviewforge.service.ai.AIProviderRouter;

class InterviewReportServiceTest {

    private InterviewSessionRepository sessionRepository;
    private InterviewQuestionRepository questionRepository;
    private AIProviderRouter aiProviderRouter;
    private InterviewReportService reportService;

    @BeforeEach
    void setUp() {
        sessionRepository = mock(InterviewSessionRepository.class);
        questionRepository = mock(InterviewQuestionRepository.class);
        aiProviderRouter = mock(AIProviderRouter.class);

        reportService = new InterviewReportService(
                sessionRepository,
                questionRepository,
                aiProviderRouter
        );
    }

    @Test
    void generateReport_success_returnsCombinedMetricsAndAiReport() {
        Long sessionId = 100L;
        InterviewSession session = new InterviewSession();
        session.setId(sessionId);
        session.setTotalQuestions(3);

        InterviewQuestionEntity q1 = new InterviewQuestionEntity();
        q1.setSessionId(sessionId);
        q1.setQuestionNumber(1);
        q1.setQuestion("Explain OOP concepts.");
        q1.setCategory("Java");
        q1.setDifficulty("Easy");
        q1.setCandidateAnswer("Encapsulation, Inheritance, Polymorphism, Abstraction.");
        q1.setScore(8);
        q1.setAiFeedback("Good summary.");
        q1.setAnswered(true);

        InterviewQuestionEntity q2 = new InterviewQuestionEntity();
        q2.setSessionId(sessionId);
        q2.setQuestionNumber(2);
        q2.setQuestion("How does Spring DI work?");
        q2.setCategory("Spring");
        q2.setDifficulty("Medium");
        q2.setCandidateAnswer("Inversion of Control container manages beans.");
        q2.setScore(6);
        q2.setAiFeedback("Accurate but concise.");
        q2.setAnswered(true);

        InterviewQuestionEntity q3 = new InterviewQuestionEntity();
        q3.setSessionId(sessionId);
        q3.setQuestionNumber(3);
        q3.setQuestion("Explain distributed locks.");
        q3.setAnswered(false);

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(questionRepository.findBySessionIdOrderByQuestionNumber(sessionId))
                .thenReturn(List.of(q1, q2, q3));

        InterviewReport mockAiReport = new InterviewReport(
                null, 0, 0, 0, 0.0,
                "Strong foundational Java knowledge with room for architectural depth.",
                List.of("Core OOP", "Spring basics"),
                List.of("Distributed systems"),
                List.of("Practice Redis/Zookeeper lock patterns")
        );

        when(aiProviderRouter.chat(anyString(), eq(InterviewReport.class)))
                .thenReturn(mockAiReport);

        InterviewReport result = reportService.generateReport(sessionId);

        assertNotNull(result);
        assertEquals(sessionId, result.sessionId());
        assertEquals(3, result.totalQuestions());
        assertEquals(2, result.answeredQuestions());
        assertEquals(14, result.totalScore());
        assertEquals(7.0, result.averageScore(), 0.001);
        assertEquals("Strong foundational Java knowledge with room for architectural depth.", result.overallPerformance());
        assertEquals(List.of("Core OOP", "Spring basics"), result.strengths());
        assertEquals(List.of("Distributed systems"), result.weaknesses());
        assertEquals(List.of("Practice Redis/Zookeeper lock patterns"), result.improvements());
    }

    @Test
    void generateReport_aiProviderFailure_propagatesException() {
        Long sessionId = 100L;
        InterviewSession session = new InterviewSession();
        session.setId(sessionId);
        session.setTotalQuestions(1);

        InterviewQuestionEntity q = new InterviewQuestionEntity();
        q.setSessionId(sessionId);
        q.setQuestionNumber(1);
        q.setQuestion("What is HTTP?");
        q.setAnswered(true);
        q.setScore(7);

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(questionRepository.findBySessionIdOrderByQuestionNumber(sessionId))
                .thenReturn(List.of(q));

        when(aiProviderRouter.chat(anyString(), eq(InterviewReport.class)))
                .thenThrow(new RuntimeException("Both primary (Groq) and fallback (OpenRouter) providers failed."));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                reportService.generateReport(sessionId));

        assertEquals("Both primary (Groq) and fallback (OpenRouter) providers failed.", ex.getMessage());
    }

    @Test
    void generateReport_sessionNotFound_throwsIllegalArgumentException() {
        when(sessionRepository.findById(999L)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                reportService.generateReport(999L));

        assertEquals("Interview session not found: 999", ex.getMessage());
        verify(aiProviderRouter, never()).chat(anyString(), any());
    }

    @Test
    void generateReport_noAnsweredQuestions_calculatesZeroAverage() {
        Long sessionId = 100L;
        InterviewSession session = new InterviewSession();
        session.setId(sessionId);
        session.setTotalQuestions(2);

        InterviewQuestionEntity q = new InterviewQuestionEntity();
        q.setSessionId(sessionId);
        q.setQuestionNumber(1);
        q.setAnswered(false);

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(questionRepository.findBySessionIdOrderByQuestionNumber(sessionId))
                .thenReturn(List.of(q));

        InterviewReport mockAiReport = new InterviewReport(
                null, 0, 0, 0, 0.0,
                "Candidate did not answer any questions.",
                List.of(),
                List.of("Incomplete interview"),
                List.of("Complete mock interview questions")
        );

        when(aiProviderRouter.chat(anyString(), eq(InterviewReport.class)))
                .thenReturn(mockAiReport);

        InterviewReport result = reportService.generateReport(sessionId);

        assertNotNull(result);
        assertEquals(0, result.answeredQuestions());
        assertEquals(0, result.totalScore());
        assertEquals(0.0, result.averageScore(), 0.001);
    }
}
