package com.interviewforge.dto;

import java.util.List;

public record ResumeAnalysis(
        List<String> technicalSkills,
        List<String> strengths,
        List<String> weaknesses,
        List<String> missingSkills,
        List<String> projectFeedback,
        List<String> suggestions
) {
}