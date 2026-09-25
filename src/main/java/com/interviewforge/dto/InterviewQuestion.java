package com.interviewforge.dto;

public record InterviewQuestion(
        String question,
        String category,
        String difficulty
) {
}