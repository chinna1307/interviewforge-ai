package com.interviewforge.dto;

import java.util.List;

public record InterviewReport(

        Long sessionId,

        int totalQuestions,

        int answeredQuestions,

        int totalScore,

        double averageScore,

        String overallPerformance,

        List<String> strengths,

        List<String> weaknesses,

        List<String> improvements

) {
}