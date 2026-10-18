package com.interviewforge.dto;

public record ResumeUploadResponse(
        String message,
        Long resumeId,
        String status,
        boolean duplicate
) {
    public ResumeUploadResponse(String message, Long resumeId) {
        this(message, resumeId, "READY", false);
    }
}

