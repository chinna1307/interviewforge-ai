package com.interviewforge.dto;

import java.time.LocalDateTime;

public record SessionSummaryDto(
        Long sessionId,
        Long resumeId,
        String resumeFileName,
        int totalQuestions,
        int answeredQuestions,
        int currentQuestion,
        String status,
        double averageScore,
        LocalDateTime startedAt
) {
}
