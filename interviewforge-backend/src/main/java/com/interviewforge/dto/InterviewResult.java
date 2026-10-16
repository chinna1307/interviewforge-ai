package com.interviewforge.dto;

public record InterviewResult(
        Long sessionId,
        int totalQuestions,
        int answeredQuestions,
        int totalScore,
        double averageScore
) {
}