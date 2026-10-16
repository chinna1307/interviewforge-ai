package com.interviewforge.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.interviewforge.dto.InterviewQuestion;
import com.interviewforge.dto.InterviewQuestionSet;
import com.interviewforge.dto.InterviewResult;
import com.interviewforge.dto.SessionSummaryDto;
import com.interviewforge.entity.InterviewQuestionEntity;
import com.interviewforge.entity.InterviewSession;
import com.interviewforge.entity.Resume;
import com.interviewforge.repository.InterviewQuestionRepository;
import com.interviewforge.repository.InterviewSessionRepository;
import com.interviewforge.repository.ResumeRepository;

@Service
public class InterviewSessionService {

    private final InterviewSessionRepository interviewSessionRepository;
    private final InterviewQuestionRepository interviewQuestionRepository;
    private final ResumeRepository resumeRepository;
    private final MockInterviewService mockInterviewService;

    public InterviewSessionService(
            InterviewSessionRepository interviewSessionRepository,
            InterviewQuestionRepository interviewQuestionRepository,
            ResumeRepository resumeRepository,
            MockInterviewService mockInterviewService) {

        this.interviewSessionRepository = interviewSessionRepository;
        this.interviewQuestionRepository = interviewQuestionRepository;
        this.resumeRepository = resumeRepository;
        this.mockInterviewService = mockInterviewService;
    }

    public void verifyResumeOwnership(Long resumeId, String userEmail) {
        if (userEmail == null) return;
        resumeRepository.findByIdAndUserEmail(resumeId, userEmail)
                .orElseThrow(() -> new AccessDeniedException("Resume not found or access denied."));
    }

    public InterviewSession verifySessionOwnership(Long sessionId, String userEmail) {
        InterviewSession session = getSession(sessionId);
        if (userEmail != null) {
            verifyResumeOwnership(session.getResumeId(), userEmail);
        }
        return session;
    }

    @Transactional
    public InterviewSession startInterview(Long resumeId) {
        InterviewQuestionSet questionSet = mockInterviewService.generateQuestions(resumeId);

        if (questionSet == null || questionSet.questions() == null || questionSet.questions().isEmpty()) {
            throw new IllegalStateException("AI provider returned an empty question set. Please try again.");
        }

        InterviewSession session = new InterviewSession();
        session.setResumeId(resumeId);
        session.setTotalQuestions(questionSet.questions().size());
        session.setCurrentQuestion(1);
        session.setStatus("STARTED");
        session.setStartedAt(LocalDateTime.now());

        InterviewSession savedSession = interviewSessionRepository.save(session);

        List<InterviewQuestionEntity> questionEntities = new ArrayList<>();
        int questionNumber = 1;

        for (InterviewQuestion question : questionSet.questions()) {
            InterviewQuestionEntity entity = new InterviewQuestionEntity();
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
                        new IllegalArgumentException("Interview session not found: " + sessionId));
    }

    public InterviewResult getInterviewResult(Long sessionId) {
        InterviewSession session = getSession(sessionId);
        List<InterviewQuestionEntity> questions =
                interviewQuestionRepository.findBySessionIdOrderByQuestionNumber(sessionId);

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
                : Math.round(((double) totalScore / answeredQuestions) * 100.0) / 100.0;

        return new InterviewResult(
                session.getId(),
                session.getTotalQuestions(),
                answeredQuestions,
                totalScore,
                averageScore
        );
    }

    @Transactional
    public InterviewSession updateProgress(Long sessionId, int questionNumber) {
        InterviewSession session = getSession(sessionId);
        List<InterviewQuestionEntity> questions =
                interviewQuestionRepository.findBySessionIdOrderByQuestionNumber(sessionId);

        long answeredCount = questions.stream().filter(InterviewQuestionEntity::isAnswered).count();

        if (answeredCount >= session.getTotalQuestions()) {
            session.setCurrentQuestion(session.getTotalQuestions());
            session.setStatus("COMPLETED");
        } else {
            int nextUnanswered = questions.stream()
                    .filter(q -> !q.isAnswered())
                    .mapToInt(InterviewQuestionEntity::getQuestionNumber)
                    .findFirst()
                    .orElse(Math.min(questionNumber + 1, session.getTotalQuestions()));
            session.setCurrentQuestion(nextUnanswered);
            session.setStatus("IN_PROGRESS");
        }

        return interviewSessionRepository.save(session);
    }

    public List<SessionSummaryDto> getUserSessionHistory(String userEmail) {
        List<Resume> userResumes = resumeRepository.findByUserEmailOrderByUploadedAtDesc(userEmail);
        if (userResumes.isEmpty()) {
            return List.of();
        }

        Map<Long, String> resumeNames = userResumes.stream()
                .collect(Collectors.toMap(Resume::getId, Resume::getFileName));
        List<Long> resumeIds = new ArrayList<>(resumeNames.keySet());

        List<InterviewSession> sessions =
                interviewSessionRepository.findByResumeIdInOrderByStartedAtDesc(resumeIds);

        return sessions.stream().map(session -> {
            InterviewResult result = getInterviewResult(session.getId());
            return new SessionSummaryDto(
                    session.getId(),
                    session.getResumeId(),
                    resumeNames.getOrDefault(session.getResumeId(), "Resume #" + session.getResumeId()),
                    session.getTotalQuestions(),
                    result.answeredQuestions(),
                    session.getCurrentQuestion(),
                    session.getStatus(),
                    result.averageScore(),
                    session.getStartedAt()
            );
        }).toList();
    }
}