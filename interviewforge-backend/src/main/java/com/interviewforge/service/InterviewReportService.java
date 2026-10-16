package com.interviewforge.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.interviewforge.dto.InterviewReport;
import com.interviewforge.entity.InterviewQuestionEntity;
import com.interviewforge.entity.InterviewSession;
import com.interviewforge.repository.InterviewQuestionRepository;
import com.interviewforge.repository.InterviewSessionRepository;
import com.interviewforge.service.ai.AIProviderRouter;

@Service
public class InterviewReportService {

    private final InterviewSessionRepository interviewSessionRepository;
    private final InterviewQuestionRepository interviewQuestionRepository;
    private final AIProviderRouter aiProviderRouter;

    public InterviewReportService(
            InterviewSessionRepository interviewSessionRepository,
            InterviewQuestionRepository interviewQuestionRepository,
            AIProviderRouter aiProviderRouter) {

        this.interviewSessionRepository = interviewSessionRepository;
        this.interviewQuestionRepository = interviewQuestionRepository;
        this.aiProviderRouter = aiProviderRouter;
    }

    public InterviewReport generateReport(Long sessionId) {

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

        String interviewData = questions.stream()
                .map(question -> """
                        Question %d:
                        %s

                        Category:
                        %s

                        Difficulty:
                        %s

                        Candidate Answer:
                        %s

                        AI Score:
                        %s

                        AI Feedback:
                        %s
                        """.formatted(
                                question.getQuestionNumber(),
                                question.getQuestion(),
                                question.getCategory(),
                                question.getDifficulty(),
                                question.getCandidateAnswer(),
                                question.getScore(),
                                question.getAiFeedback()
                        ))
                .collect(Collectors.joining("\n\n"));

        String prompt = """
                You are an expert technical interview evaluator.

                Analyze the candidate's complete mock interview performance.

                Interview information:

                Total Questions: %d
                Answered Questions: %d
                Total Score: %d
                Average Score: %.2f

                Question-by-question evaluation:

                %s

                Based ONLY on the interview information above, provide:

                1. Overall performance
                2. Key strengths
                3. Key weaknesses
                4. Specific improvement areas

                Do not invent technologies, skills, experience,
                or qualifications that are not supported by the
                interview data.

                Keep the analysis practical and concise.

                Return only the requested structured format.
                """.formatted(
                        session.getTotalQuestions(),
                        answeredQuestions,
                        totalScore,
                        averageScore,
                        interviewData
                );

        InterviewReport aiReport =
                aiProviderRouter.chat(
                        prompt,
                        InterviewReport.class
                );

        return new InterviewReport(
                session.getId(),
                session.getTotalQuestions(),
                answeredQuestions,
                totalScore,
                averageScore,
                aiReport.overallPerformance(),
                aiReport.strengths(),
                aiReport.weaknesses(),
                aiReport.improvements()
        );
    }
}