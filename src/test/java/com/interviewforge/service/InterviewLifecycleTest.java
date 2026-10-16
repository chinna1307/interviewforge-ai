package com.interviewforge.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.interviewforge.dto.AnswerEvaluation;
import com.interviewforge.dto.InterviewAnswerRequest;
import com.interviewforge.dto.InterviewQuestion;
import com.interviewforge.dto.InterviewQuestionSet;
import com.interviewforge.entity.InterviewQuestionEntity;
import com.interviewforge.entity.InterviewSession;
import com.interviewforge.repository.InterviewQuestionRepository;
import com.interviewforge.repository.InterviewSessionRepository;
import com.interviewforge.repository.ResumeRepository;
import com.interviewforge.service.ai.AIProviderRouter;

class InterviewLifecycleTest {

    private InterviewSessionRepository sessionRepository;
    private InterviewQuestionRepository questionRepository;
    private ResumeRepository resumeRepository;
    private MockInterviewService mockInterviewService;
    private AIProviderRouter aiProviderRouter;
    private InterviewSessionService sessionService;
    private InterviewAnswerService answerService;

    @BeforeEach
    void setUp() {
        sessionRepository = mock(InterviewSessionRepository.class);
        questionRepository = mock(InterviewQuestionRepository.class);
        resumeRepository = mock(ResumeRepository.class);
        mockInterviewService = mock(MockInterviewService.class);
        aiProviderRouter = mock(AIProviderRouter.class);

        sessionService = new InterviewSessionService(
                sessionRepository, questionRepository, resumeRepository, mockInterviewService);
        answerService = new InterviewAnswerService(
                questionRepository, sessionService, aiProviderRouter);
    }

    @Test
    void startInterview_createsSessionAndPersistsQuestions() {
        List<InterviewQuestion> generated = List.of(
                new InterviewQuestion("Explain Spring Boot auto-configuration", "Backend", "Medium"),
                new InterviewQuestion("How does PGVector index embeddings?", "Database", "Hard")
        );
        when(mockInterviewService.generateQuestions(10L))
                .thenReturn(new InterviewQuestionSet(generated));

        when(sessionRepository.save(any(InterviewSession.class))).thenAnswer(inv -> {
            InterviewSession s = inv.getArgument(0);
            return s;
        });

        InterviewSession session = sessionService.startInterview(10L);
        assertEquals(2, session.getTotalQuestions());
        assertEquals(1, session.getCurrentQuestion());
        assertEquals("STARTED", session.getStatus());
    }

    @Test
    void submitAnswer_evaluatesAndMarksQuestionAnswered() {
        InterviewQuestionEntity q = new InterviewQuestionEntity();
        q.setSessionId(99L);
        q.setQuestionNumber(1);
        q.setQuestion("What is JWT?");
        q.setCategory("Security");
        q.setDifficulty("Easy");
        q.setAnswered(false);

        InterviewSession session = new InterviewSession();
        session.setResumeId(10L);
        session.setTotalQuestions(1);
        session.setCurrentQuestion(1);
        session.setStatus("STARTED");

        when(questionRepository.findById(5L)).thenReturn(Optional.of(q));
        when(sessionRepository.findById(99L)).thenReturn(Optional.of(session));
        when(aiProviderRouter.chat(any(), eq(AnswerEvaluation.class)))
                .thenReturn(new AnswerEvaluation(8, "Clear explanation of stateless claims."));
        when(questionRepository.findBySessionIdOrderByQuestionNumber(99L))
                .thenReturn(List.of(q));
        when(sessionRepository.save(any())).thenReturn(session);

        AnswerEvaluation eval = answerService.submitAnswer(
                5L, new InterviewAnswerRequest("JWT is a signed JSON token."));

        assertEquals(8, eval.score());
        assertTrue(q.isAnswered());
        assertEquals("COMPLETED", session.getStatus());
    }

    @Test
    void submitAnswer_emptyAnswer_throwsIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () ->
                answerService.submitAnswer(5L, new InterviewAnswerRequest("   ")));
    }
}
