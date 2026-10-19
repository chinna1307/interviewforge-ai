package com.interviewforge.dto;

import java.time.LocalDateTime;

public record ResumeSummaryDto(
        Long id,
        String fileName,
        String fileType,
        LocalDateTime uploadedAt,
        String status,
        boolean active
) {
    public ResumeSummaryDto(Long id, String fileName, String fileType, LocalDateTime uploadedAt, String status) {
        this(id, fileName, fileType, uploadedAt, status, true);
    }

    public ResumeSummaryDto(Long id, String fileName, String fileType, LocalDateTime uploadedAt) {
        this(id, fileName, fileType, uploadedAt, "READY", true);
    }
}

