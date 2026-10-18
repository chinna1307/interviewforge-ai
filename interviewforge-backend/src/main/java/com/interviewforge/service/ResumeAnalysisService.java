package com.interviewforge.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import com.interviewforge.dto.ResumeAnalysis;
import com.interviewforge.entity.Resume;
import com.interviewforge.repository.ResumeRepository;
import com.interviewforge.service.ai.AIProviderRouter;

@Service
public class ResumeAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(ResumeAnalysisService.class);

    private final ChatClient chatClient;
    private final AIProviderRouter aiProviderRouter;
    private final ResumeRepository resumeRepository;

    public ResumeAnalysisService(
            ChatClient chatClient,
            AIProviderRouter aiProviderRouter,
            ResumeRepository resumeRepository) {
        this.chatClient = chatClient;
        this.aiProviderRouter = aiProviderRouter;
        this.resumeRepository = resumeRepository;
    }

    public ResumeAnalysis analyzeResume(Long resumeId) {
        try {
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
        } catch (Exception ex) {
            log.info("Primary ChatClient (Gemini/RAG) failed for resumeId={} [{}]: {}. Falling back to extracted text with secondary providers.",
                    resumeId, ex.getClass().getSimpleName(), ex.getMessage());

            Resume resume = resumeRepository.findById(resumeId)
                    .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + resumeId));

            String fallbackPrompt = """
                    You are an expert resume analyst.
                    Analyze ONLY the candidate's resume text below. Do not invent facts.

                    Resume Text:
                    %s

                    Identify:
                    1. technicalSkills
                    2. strengths
                    3. weaknesses
                    4. missingSkills
                    5. projectFeedback
                    6. suggestions
                    """.formatted(resume.getExtractedText());

            return aiProviderRouter.chat(fallbackPrompt, ResumeAnalysis.class);
        }
    }
}