package com.interviewforge.dto;

import java.util.List;

public record InterviewQuestionSet(
        List<InterviewQuestion> questions
) {
}