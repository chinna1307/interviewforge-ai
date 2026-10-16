package com.interviewforge.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.interviewforge.dto.AnswerEvaluation;
import com.interviewforge.dto.InterviewAnswerRequest;
import com.interviewforge.entity.InterviewQuestionEntity;
import com.interviewforge.entity.InterviewSession;
import com.interviewforge.repository.InterviewQuestionRepository;
import com.interviewforge.service.ai.AIProviderRouter;

@Service
public class InterviewAnswerService {

    private final InterviewQuestionRepository interviewQuestionRepository;
    private final InterviewSessionService interviewSessionService;
    private final AIProviderRouter aiProviderRouter;

    public InterviewAnswerService(
            InterviewQuestionRepository interviewQuestionRepository,
            InterviewSessionService interviewSessionService,
            AIProviderRouter aiProviderRouter) {

        this.interviewQuestionRepository = interviewQuestionRepository;
        this.interviewSessionService = interviewSessionService;
        this.aiProviderRouter = aiProviderRouter;
    }

    @Transactional
    public AnswerEvaluation submitAnswer(
            Long questionId,
            InterviewAnswerRequest request,
            String userEmail) {

        if (request == null || request.answer() == null || request.answer().isBlank()) {
            throw new IllegalArgumentException("Answer cannot be empty.");
        }

        String trimmedAnswer = request.answer().trim();
        if (trimmedAnswer.length() > 8000) {
            throw new IllegalArgumentException("Answer exceeds maximum length of 8000 characters.");
        }

        InterviewQuestionEntity question =
                interviewQuestionRepository
                        .findById(questionId)
                        .orElseThrow(() ->
                                new IllegalArgumentException("Interview question not found: " + questionId));

        InterviewSession session = interviewSessionService.verifySessionOwnership(
                question.getSessionId(),
                userEmail
        );

        if ("COMPLETED".equalsIgnoreCase(session.getStatus()) && question.isAnswered()) {
            throw new IllegalStateException("This interview session is already completed.");
        }

        String prompt = """
                You are an expert technical interviewer.

                Evaluate the candidate's answer to the interview question.

                Interview question:
                %s

                Category:
                %s

                Difficulty:
                %s

                Candidate's answer:
                %s

                Evaluate the answer based on:
                - Technical correctness
                - Understanding of the concept
                - Completeness
                - Clarity

                Give a score from 0 to 10.
                Provide concise and practical feedback.

                Return only:
                - score
                - feedback
                """.formatted(
                        question.getQuestion(),
                        question.getCategory(),
                        question.getDifficulty(),
                        trimmedAnswer
                );

        AnswerEvaluation evaluation = aiProviderRouter.chat(prompt, AnswerEvaluation.class);

        int safeScore = evaluation.score() == null
                ? 0
                : Math.max(0, Math.min(10, evaluation.score()));
        String safeFeedback = (evaluation.feedback() == null || evaluation.feedback().isBlank())
                ? "Answer recorded."
                : evaluation.feedback();

        AnswerEvaluation normalizedEvaluation = new AnswerEvaluation(safeScore, safeFeedback);

        question.setCandidateAnswer(trimmedAnswer);
        question.setAiFeedback(safeFeedback);
        question.setScore(safeScore);
        question.setAnswered(true);

        interviewQuestionRepository.save(question);

        interviewSessionService.updateProgress(
                question.getSessionId(),
                question.getQuestionNumber()
        );

        return normalizedEvaluation;
    }

    public AnswerEvaluation submitAnswer(Long questionId, InterviewAnswerRequest request) {
        return submitAnswer(questionId, request, null);
    }
}