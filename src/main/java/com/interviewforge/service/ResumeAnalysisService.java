package com.interviewforge.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import com.interviewforge.dto.ResumeAnalysis;

@Service
public class ResumeAnalysisService {

    private final ChatClient chatClient;

    public ResumeAnalysisService(ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    public ResumeAnalysis analyzeResume(Long resumeId) {

        return chatClient
                .prompt()
                .system("""
                        You are an expert resume analyst.

                        Analyze only the information retrieved from the candidate's resume.

                        Do not invent skills, experience, projects, qualifications,
                        or technologies that are not present in the resume.

                        Provide practical and honest analysis.
                        """)
                .user("""
                        Analyze this candidate's resume.

                        Identify:
                        1. Technical skills
                        2. Strengths
                        3. Weaknesses
                        4. Missing or recommended skills
                        5. Feedback on projects
                        6. Improvement suggestions

                        Return the analysis in the requested structured format.
                        """)
                .advisors(a -> a.param(
                        "qa_filter_expression",
                        "resumeId == '" + resumeId + "'"
                ))
                .call()
                .entity(
                        ResumeAnalysis.class,
                        spec -> spec.validateSchema()
                );
    }
}