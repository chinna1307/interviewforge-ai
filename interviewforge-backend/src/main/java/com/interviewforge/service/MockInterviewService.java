package com.interviewforge.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import com.interviewforge.dto.InterviewQuestionSet;
import com.interviewforge.service.ai.AIProviderRouter;

@Service
public class MockInterviewService {

    private final AIProviderRouter aiProviderRouter;
    private final VectorStore vectorStore;

    public MockInterviewService(
            AIProviderRouter aiProviderRouter,
            VectorStore vectorStore) {

        this.aiProviderRouter = aiProviderRouter;
        this.vectorStore = vectorStore;
    }

    public InterviewQuestionSet generateQuestions(Long resumeId) {

        List<Document> documents = vectorStore.similaritySearch(
                SearchRequest.builder()
                        .query("technical skills, projects, Java, backend development, experience")
                        .topK(5)
                        .filterExpression(
                                "resumeId == '" + resumeId + "'"
                        )
                        .build()
        );

        String resumeContext = documents.stream()
                .map(Document::getText)
                .collect(Collectors.joining("\n\n"));

        if (resumeContext.isBlank()) {
            throw new IllegalArgumentException(
                    "No resume information found for resume ID: " + resumeId
            );
        }

        String prompt = """
                You are an expert technical interviewer.

                Generate 5 personalized interview questions based ONLY
                on the candidate's resume information provided below.

                Resume context:
                %s

                Create a balanced interview:

                1. Two technical questions
                2. One project-based question
                3. One Java/backend question
                4. One problem-solving question

                For every question provide:
                - question
                - category
                - difficulty

                Difficulty must be exactly one of:
                Easy, Medium, Hard.

                Do not invent technologies, projects, experience,
                or skills that are not present in the resume context.

                Return only the requested structured format.
                """.formatted(resumeContext);

        return aiProviderRouter.chat(
                prompt,
                InterviewQuestionSet.class
        );
    }
}