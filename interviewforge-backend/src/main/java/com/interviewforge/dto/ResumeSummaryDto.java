package com.interviewforge.dto;

import java.time.LocalDateTime;

public record ResumeSummaryDto(
        Long id,
        String fileName,
        String fileType,
        LocalDateTime uploadedAt,
        String status
) {
    public ResumeSummaryDto(Long id, String fileName, String fileType, LocalDateTime uploadedAt) {
        this(id, fileName, fileType, uploadedAt, "READY");
    }
}

