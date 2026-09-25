package com.interviewforge.service;

import org.springframework.stereotype.Service;

import com.interviewforge.dto.AnswerEvaluation;
import com.interviewforge.dto.InterviewAnswerRequest;
import com.interviewforge.entity.InterviewQuestionEntity;
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

    public AnswerEvaluation submitAnswer(
            Long questionId,
            InterviewAnswerRequest request) {

        InterviewQuestionEntity question =
                interviewQuestionRepository
                        .findById(questionId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Interview question not found: "
                                                + questionId
                                ));

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
                        request.answer()
                );

        AnswerEvaluation evaluation =
                aiProviderRouter.chat(
                        prompt,
                        AnswerEvaluation.class
                );

        question.setCandidateAnswer(request.answer());
        question.setAiFeedback(evaluation.feedback());
        question.setScore(evaluation.score());
        question.setAnswered(true);

        interviewQuestionRepository.save(question);

        interviewSessionService.updateProgress(
                question.getSessionId(),
                question.getQuestionNumber()
        );

        return evaluation;
    }
}