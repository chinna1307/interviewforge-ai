package com.interviewforge.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import com.interviewforge.dto.ResumeUploadResponse;
import com.interviewforge.entity.Resume;
import com.interviewforge.entity.ResumeProcessingStatus;
import com.interviewforge.entity.User;
import com.interviewforge.repository.ResumeRepository;

@Service
public class ResumeService {

    private static final Logger log = LoggerFactory.getLogger(ResumeService.class);

    private final ResumeRepository resumeRepository;
    private final VectorStore vectorStore;

    public ResumeService(ResumeRepository resumeRepository, VectorStore vectorStore) {
        this.resumeRepository = resumeRepository;
        this.vectorStore = vectorStore;
    }

    public static String calculateSha256(byte[] content) {
        if (content == null || content.length == 0) {
            throw new IllegalArgumentException("Cannot calculate hash of empty content");
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(content);
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    public ResumeUploadResponse processResume(
            String fileName,
            String fileType,
            byte[] fileBytes,
            String extractedText,
            User user) {

        String fileHash = calculateSha256(fileBytes);

        // 1. Scoped check: see if this authenticated user already uploaded identical file bytes
        Optional<Resume> existingOpt = resumeRepository.findFirstByUserAndFileHashOrderByUploadedAtDesc(user, fileHash);

        if (existingOpt.isPresent()) {
            Resume existing = existingOpt.get();
            if (existing.getProcessingStatus() == ResumeProcessingStatus.READY) {
                log.info("Duplicate resume detected for user id={} (Resume #{}) with hash {}. Returning existing record.",
                        user.getId(), existing.getId(), fileHash);
                return new ResumeUploadResponse(
                        "You've already uploaded this resume. View your existing analysis or re-analyze it.",
                        existing.getId(),
                        "READY",
                        true
                );
            }

            // If existing resume failed embedding, retry ingestion cleanly
            log.info("Found existing incomplete resume #{} for user id={}. Retrying embedding ingestion.",
                    existing.getId(), user.getId());
            boolean ingested = ingestEmbeddings(existing, extractedText, fileName, user);
            if (ingested) {
                existing.setProcessingStatus(ResumeProcessingStatus.READY);
                existing.setFailureReason(null);
                resumeRepository.save(existing);
                return new ResumeUploadResponse(
                        "Resume embedding retry succeeded!",
                        existing.getId(),
                        "READY",
                        true
                );
            } else {
                return new ResumeUploadResponse(
                        "Resume exists, but embedding ingestion failed. You can retry indexing.",
                        existing.getId(),
                        "FAILED",
                        true
                );
            }
        }

        // 2. New upload: create and persist record in PROCESSING status
        Resume resume = new Resume();
        resume.setFileName(fileName);
        resume.setFileType(fileType);
        resume.setFileHash(fileHash);
        resume.setExtractedText(extractedText);
        resume.setUploadedAt(LocalDateTime.now());
        resume.setUser(user);
        resume.setProcessingStatus(ResumeProcessingStatus.PROCESSING);

        Resume savedResume;
        try {
            savedResume = resumeRepository.save(resume);
        } catch (DataIntegrityViolationException dive) {
            // Concurrent duplicate upload occurred
            log.warn("Concurrent duplicate upload for user id={} with hash {}: {}", user.getId(), fileHash, dive.getMessage());
            Resume existing = resumeRepository.findFirstByUserAndFileHashOrderByUploadedAtDesc(user, fileHash)
                    .orElseThrow(() -> dive);
            return new ResumeUploadResponse(
                    "You've already uploaded this resume. View your existing analysis or re-analyze it.",
                    existing.getId(),
                    existing.getProcessingStatus().name(),
                    true
            );
        }

        // 3. Attempt vector store ingestion
        boolean ingested = ingestEmbeddings(savedResume, extractedText, fileName, user);
        if (ingested) {
            savedResume.setProcessingStatus(ResumeProcessingStatus.READY);
            savedResume.setFailureReason(null);
            resumeRepository.save(savedResume);
            return new ResumeUploadResponse(
                    "Resume uploaded and text extracted successfully!",
                    savedResume.getId(),
                    "READY",
                    false
            );
        } else {
            savedResume.setProcessingStatus(ResumeProcessingStatus.FAILED);
            resumeRepository.save(savedResume);
            return new ResumeUploadResponse(
                    "Resume uploaded and text extracted, but vector indexing failed. You can retry indexing.",
                    savedResume.getId(),
                    "FAILED",
                    false
            );
        }
    }

    public ResumeUploadResponse retryResumeEmbedding(Long resumeId, String userEmail) {
        Resume resume = resumeRepository.findByIdAndUserEmail(resumeId, userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found or access denied."));

        if (resume.getProcessingStatus() == ResumeProcessingStatus.READY) {
            return new ResumeUploadResponse(
                    "Resume is already successfully processed and indexed.",
                    resume.getId(),
                    "READY",
                    false
            );
        }

        resume.setProcessingStatus(ResumeProcessingStatus.PROCESSING);
        resumeRepository.save(resume);

        boolean ingested = ingestEmbeddings(resume, resume.getExtractedText(), resume.getFileName(), resume.getUser());
        if (ingested) {
            resume.setProcessingStatus(ResumeProcessingStatus.READY);
            resume.setFailureReason(null);
            resumeRepository.save(resume);
            return new ResumeUploadResponse(
                    "Embedding indexing succeeded!",
                    resume.getId(),
                    "READY",
                    false
            );
        } else {
            resume.setProcessingStatus(ResumeProcessingStatus.FAILED);
            resumeRepository.save(resume);
            return new ResumeUploadResponse(
                    "Embedding indexing failed: " + (resume.getFailureReason() != null ? resume.getFailureReason() : "Unknown error"),
                    resume.getId(),
                    "FAILED",
                    false
            );
        }
    }

    private boolean ingestEmbeddings(Resume resume, String extractedText, String fileName, User user) {
        try {
            // Delete existing chunks for this specific resume to prevent duplicates upon retry
            try {
                if (vectorStore != null) {
                    vectorStore.delete(new FilterExpressionBuilder().eq("resumeId", resume.getId().toString()).build());
                }
            } catch (Exception deleteEx) {
                log.warn("Vector store chunk cleanup for resumeId={} was skipped or not supported: {}",
                        resume.getId(), deleteEx.getMessage());
            }

            if (vectorStore != null && extractedText != null && !extractedText.isBlank()) {
                Document document = new Document(
                        extractedText,
                        Map.of(
                                "resumeId", resume.getId().toString(),
                                "userId", user != null && user.getId() != null ? user.getId().toString() : "unknown",
                                "fileName", fileName != null ? fileName : "resume",
                                "type", "resume"
                        )
                );

                TokenTextSplitter splitter = new TokenTextSplitter();
                List<Document> chunks = splitter.apply(List.of(document));

                vectorStore.add(chunks);
                log.info("Successfully indexed {} chunks for resumeId={}", chunks.size(), resume.getId());
            }
            return true;
        } catch (Exception ex) {
            log.error("Vector store indexing failed for resumeId={}: {}", resume.getId(), ex.getMessage(), ex);
            resume.setFailureReason(sanitizeErrorMessage(ex.getMessage()));
            return false;
        }
    }

    private String sanitizeErrorMessage(String msg) {
        if (msg == null || msg.isBlank()) {
            return "Vector indexing failed";
        }
        String sanitized = msg.replaceAll("(?i)(bearer\\s+[a-zA-Z0-9._-]+|key=[a-zA-Z0-9._-]+)", "[REDACTED]");
        if (sanitized.length() > 255) {
            return sanitized.substring(0, 255);
        }
        return sanitized;
    }

    // Retained for backward compatibility with existing tests
    public Resume saveResume(String fileName, String fileType, String extractedText, User user) {
        byte[] bytes = extractedText != null ? extractedText.getBytes(StandardCharsets.UTF_8) : fileName.getBytes(StandardCharsets.UTF_8);
        ResumeUploadResponse resp = processResume(fileName, fileType, bytes, extractedText, user);
        return resumeRepository.findById(resp.resumeId())
                .orElseGet(() -> {
                    Resume r = new Resume();
                    r.setId(resp.resumeId());
                    r.setFileName(fileName);
                    r.setUser(user);
                    return r;
                });
    }
}