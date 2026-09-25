package com.interviewforge.service;

import java.time.LocalDateTime;
import com.interviewforge.dto.InterviewResult;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.interviewforge.dto.InterviewQuestion;
import com.interviewforge.dto.InterviewQuestionSet;
import com.interviewforge.entity.InterviewQuestionEntity;
import com.interviewforge.entity.InterviewSession;
import com.interviewforge.repository.InterviewQuestionRepository;
import com.interviewforge.repository.InterviewSessionRepository;

@Service
public class InterviewSessionService {

    private final InterviewSessionRepository interviewSessionRepository;
    private final InterviewQuestionRepository interviewQuestionRepository;
    private final MockInterviewService mockInterviewService;

    public InterviewSessionService(
            InterviewSessionRepository interviewSessionRepository,
            InterviewQuestionRepository interviewQuestionRepository,
            MockInterviewService mockInterviewService) {

        this.interviewSessionRepository = interviewSessionRepository;
        this.interviewQuestionRepository = interviewQuestionRepository;
        this.mockInterviewService = mockInterviewService;
    }

    public InterviewSession startInterview(Long resumeId) {

        InterviewQuestionSet questionSet =
                mockInterviewService.generateQuestions(resumeId);

        InterviewSession session = new InterviewSession();

        session.setResumeId(resumeId);

        session.setTotalQuestions(
                questionSet.questions().size()
        );

        session.setCurrentQuestion(1);

        session.setStatus("STARTED");

        session.setStartedAt(LocalDateTime.now());

        InterviewSession savedSession =
                interviewSessionRepository.save(session);

        List<InterviewQuestionEntity> questionEntities =
                new ArrayList<>();

        int questionNumber = 1;

        for (InterviewQuestion question : questionSet.questions()) {

            InterviewQuestionEntity entity =
                    new InterviewQuestionEntity();

            entity.setSessionId(savedSession.getId());

            entity.setQuestionNumber(questionNumber);

            entity.setQuestion(question.question());

            entity.setCategory(question.category());

            entity.setDifficulty(question.difficulty());

            entity.setAnswered(false);

            questionEntities.add(entity);

            questionNumber++;
        }

        interviewQuestionRepository.saveAll(questionEntities);

        return savedSession;
    }

    public InterviewSession getSession(Long sessionId) {

        return interviewSessionRepository
                .findById(sessionId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Interview session not found: "
                                        + sessionId
                        ));
    }
    public InterviewResult getInterviewResult(Long sessionId) {

        InterviewSession session =
                interviewSessionRepository
                        .findById(sessionId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Interview session not found: "
                                                + sessionId
                                ));

        List<InterviewQuestionEntity> questions =
                interviewQuestionRepository
                        .findBySessionIdOrderByQuestionNumber(sessionId);

        int answeredQuestions = 0;
        int totalScore = 0;

        for (InterviewQuestionEntity question : questions) {

            if (question.isAnswered()) {

                answeredQuestions++;

                if (question.getScore() != null) {
                    totalScore += question.getScore();
                }
            }
        }

        double averageScore = answeredQuestions == 0
                ? 0.0
                : (double) totalScore / answeredQuestions;

        return new InterviewResult(
                session.getId(),
                session.getTotalQuestions(),
                answeredQuestions,
                totalScore,
                averageScore
        );
    }
    public InterviewSession updateProgress(
            Long sessionId,
            int questionNumber) {

        InterviewSession session =
                interviewSessionRepository
                        .findById(sessionId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Interview session not found: "
                                                + sessionId
                                ));

        if (questionNumber >= session.getTotalQuestions()) {

            session.setCurrentQuestion(
                    session.getTotalQuestions()
            );

            session.setStatus("COMPLETED");

        } else {

            session.setCurrentQuestion(
                    questionNumber + 1
            );
        }

        return interviewSessionRepository.save(session);
    }
    
}