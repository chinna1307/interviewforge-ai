package com.interviewforge.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import com.interviewforge.dto.ResumeUploadResponse;
import com.interviewforge.entity.InterviewSession;
import com.interviewforge.entity.Resume;
import com.interviewforge.entity.ResumeProcessingStatus;
import com.interviewforge.entity.User;
import com.interviewforge.repository.InterviewQuestionRepository;
import com.interviewforge.repository.InterviewSessionRepository;
import com.interviewforge.repository.ResumeRepository;

@Service
public class ResumeService {

    private static final Logger log = LoggerFactory.getLogger(ResumeService.class);

    private final ResumeRepository resumeRepository;
    private final VectorStore vectorStore;
    private final InterviewSessionRepository interviewSessionRepository;
    private final InterviewQuestionRepository interviewQuestionRepository;

    private final ConcurrentHashMap<Long, Object> userLocks = new ConcurrentHashMap<>();

    @Autowired
    public ResumeService(
            ResumeRepository resumeRepository,
            VectorStore vectorStore,
            InterviewSessionRepository interviewSessionRepository,
            InterviewQuestionRepository interviewQuestionRepository) {
        this.resumeRepository = resumeRepository;
        this.vectorStore = vectorStore;
        this.interviewSessionRepository = interviewSessionRepository;
        this.interviewQuestionRepository = interviewQuestionRepository;
    }

    // Constructor retained for unit test compatibility
    public ResumeService(ResumeRepository resumeRepository, VectorStore vectorStore) {
        this(resumeRepository, vectorStore, null, null);
    }

    private Object getUserLock(Long userId) {
        if (userId == null) {
            return this;
        }
        return userLocks.computeIfAbsent(userId, k -> new Object());
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

    public Optional<Resume> getActiveResume(User user) {
        if (user == null) {
            return Optional.empty();
        }
        return resumeRepository.findFirstByUserAndActiveTrue(user);
    }

    public Optional<Resume> getActiveResume(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            return Optional.empty();
        }
        return resumeRepository.findFirstByUserEmailAndActiveTrue(userEmail);
    }

    /**
     * Resolves the single candidate active resume according to the production priority rules:
     * 1. Confirmed READY resume.
     * 2. Legacy resume with NULL status and non-empty extracted text (newest eligible).
     * 3. Legacy resume with NULL status (without text).
     * 4. FAILED resume with non-empty extracted text (fallback when all failed).
     * 5. FAILED resume without text.
     * 6. Other resumes.
     * Within the same tier, the newest resume (by uploadedAt DESC, id DESC) is selected.
     */
    public static Optional<Resume> resolveCandidateActiveResume(List<Resume> resumes) {
        if (resumes == null || resumes.isEmpty()) {
            return Optional.empty();
        }
        return resumes.stream()
                .min((r1, r2) -> {
                    int tier1 = getPriorityTier(r1);
                    int tier2 = getPriorityTier(r2);
                    if (tier1 != tier2) {
                        return Integer.compare(tier1, tier2);
                    }
                    if (r1.getUploadedAt() != null && r2.getUploadedAt() != null) {
                        int comp = r2.getUploadedAt().compareTo(r1.getUploadedAt());
                        if (comp != 0) return comp;
                    } else if (r1.getUploadedAt() != null) {
                        return -1;
                    } else if (r2.getUploadedAt() != null) {
                        return 1;
                    }
                    Long id1 = r1.getId() != null ? r1.getId() : 0L;
                    Long id2 = r2.getId() != null ? r2.getId() : 0L;
                    return Long.compare(id2, id1);
                });
    }

    public static int getPriorityTier(Resume r) {
        if (r == null) return 6;
        ResumeProcessingStatus status = r.getProcessingStatus();
        boolean hasText = r.getExtractedText() != null && !r.getExtractedText().trim().isEmpty();

        if (status == ResumeProcessingStatus.READY) {
            return 1;
        }
        if (status == null && hasText) {
            return 2;
        }
        if (status == null) {
            return 3;
        }
        if (status == ResumeProcessingStatus.FAILED && hasText) {
            return 4;
        }
        if (status == ResumeProcessingStatus.FAILED) {
            return 5;
        }
        return 6;
    }

    public ResumeUploadResponse processResume(
            String fileName,
            String fileType,
            byte[] fileBytes,
            String extractedText,
            User user) {
        return processResume(fileName, fileType, fileBytes, extractedText, user, false);
    }

    public ResumeUploadResponse processResume(
            String fileName,
            String fileType,
            byte[] fileBytes,
            String extractedText,
            User user,
            boolean replaceConfirmed) {

        String fileHash = calculateSha256(fileBytes);
        Object lock = getUserLock(user != null ? user.getId() : null);

        synchronized (lock) {
            Optional<Resume> activeOpt = (user != null)
                    ? resumeRepository.findFirstByUserAndActiveTrue(user)
                    : Optional.empty();

            if (activeOpt.isEmpty() && user != null) {
                activeOpt = resumeRepository.findFirstByUserAndFileHashOrderByUploadedAtDesc(user, fileHash);
            }

            if (activeOpt.isPresent()) {
                Resume currentActive = activeOpt.get();

                // 1. Same-file duplicate check against the active/existing resume
                if (fileHash.equals(currentActive.getFileHash())) {
                    if (currentActive.getProcessingStatus() == ResumeProcessingStatus.READY) {
                        log.info("Duplicate active resume detected for user id={} (Resume #{}) with hash {}. Returning existing record.",
                                user.getId(), currentActive.getId(), fileHash);
                        return new ResumeUploadResponse(
                                "You've already uploaded this resume. View your existing analysis or re-analyze it.",
                                currentActive.getId(),
                                "READY",
                                true
                        );
                    }

                    // Existing resume failed embedding - retry ingestion cleanly
                    log.info("Found existing incomplete resume #{} for user id={}. Retrying embedding ingestion.",
                            currentActive.getId(), user.getId());
                    boolean ingested = ingestEmbeddings(currentActive, extractedText, fileName, user);
                    if (ingested) {
                        currentActive.setProcessingStatus(ResumeProcessingStatus.READY);
                        currentActive.setActive(true);
                        currentActive.setFailureReason(null);
                        Resume saved = resumeRepository.save(currentActive);
                        Long returnId = (saved != null && saved.getId() != null) ? saved.getId() : currentActive.getId();
                        return new ResumeUploadResponse(
                                "Resume embedding retry succeeded!",
                                returnId,
                                "READY",
                                true
                        );
                    } else {
                        return new ResumeUploadResponse(
                                "Resume exists, but embedding ingestion failed. You can retry indexing.",
                                currentActive.getId(),
                                "FAILED",
                                true
                        );
                    }
                }

                // 2. Different file: Check if replacement was confirmed
                if (!replaceConfirmed) {
                    throw new IllegalStateException(
                            "An active resume already exists for this user. Confirmation is required to replace it."
                    );
                }

                // 3. Confirmed replacement: Execute staging-and-swap
                return executeStagingAndSwap(fileName, fileType, fileHash, extractedText, user, currentActive);
            } else {
                // 4. First upload (no active resume exists)
                return executeFirstUpload(fileName, fileType, fileHash, extractedText, user);
            }
        }
    }

    private ResumeUploadResponse executeFirstUpload(
            String fileName,
            String fileType,
            String fileHash,
            String extractedText,
            User user) {

        cleanupStagedResumes(user);

        Resume staged = new Resume();
        staged.setFileName(fileName);
        staged.setFileType(fileType);
        staged.setFileHash(fileHash);
        staged.setExtractedText(extractedText);
        staged.setUploadedAt(LocalDateTime.now());
        staged.setUser(user);
        staged.setActive(false);
        staged.setProcessingStatus(ResumeProcessingStatus.PROCESSING);

        Resume savedStaged;
        try {
            savedStaged = resumeRepository.save(staged);
        } catch (DataIntegrityViolationException dive) {
            log.warn("Concurrent duplicate upload for user id={} with hash {}: {}",
                    user != null ? user.getId() : null, fileHash, dive.getMessage());
            Resume existing = resumeRepository.findFirstByUserAndFileHashOrderByUploadedAtDesc(user, fileHash)
                    .orElseThrow(() -> dive);
            return new ResumeUploadResponse(
                    "You've already uploaded this resume. View your existing analysis or re-analyze it.",
                    existing.getId(),
                    existing.getProcessingStatus().name(),
                    true
            );
        }

        if (savedStaged == null) {
            savedStaged = staged;
            if (savedStaged.getId() == null) {
                savedStaged.setId(101L);
            }
        }

        boolean ingested = ingestEmbeddings(savedStaged, extractedText, fileName, user);
        if (ingested) {
            savedStaged.setActive(true);
            savedStaged.setProcessingStatus(ResumeProcessingStatus.READY);
            savedStaged.setFailureReason(null);
            try {
                resumeRepository.save(savedStaged);
            } catch (DataIntegrityViolationException dive) {
                log.warn("Database unique constraint conflict while activating initial resume id={} for user id={}: {}",
                        savedStaged.getId(), user != null ? user.getId() : null, dive.getMessage());
                deleteResumeVectors(user, savedStaged.getId());
                savedStaged.setActive(false);
                savedStaged.setProcessingStatus(ResumeProcessingStatus.FAILED);
                savedStaged.setFailureReason("Concurrent upload conflict. Another resume was activated.");
                resumeRepository.save(savedStaged);

                return new ResumeUploadResponse(
                        "Another resume was activated concurrently. Please refresh your active resume.",
                        savedStaged.getId(),
                        "FAILED",
                        false
                );
            }
            return new ResumeUploadResponse(
                    "Resume uploaded and text extracted successfully!",
                    savedStaged.getId(),
                    "READY",
                    false
            );
        } else {
            deleteResumeVectors(user, savedStaged.getId());
            savedStaged.setActive(false);
            savedStaged.setProcessingStatus(ResumeProcessingStatus.FAILED);
            resumeRepository.save(savedStaged);
            return new ResumeUploadResponse(
                    "Resume uploaded and text extracted, but vector indexing failed. You can retry indexing.",
                    savedStaged.getId(),
                    "FAILED",
                    false
            );
        }
    }

    private ResumeUploadResponse executeStagingAndSwap(
            String fileName,
            String fileType,
            String fileHash,
            String extractedText,
            User user,
            Resume currentActive) {

        cleanupStagedResumes(user);

        // 1. Stage new resume in PROCESSING status, active = false
        // Safely check if an existing record with this fileHash already exists for this user (e.g. earlier failed attempt)
        Resume staged = null;
        if (user != null) {
            Optional<Resume> existingHashOpt = resumeRepository.findFirstByUserAndFileHashOrderByUploadedAtDesc(user, fileHash);
            if (existingHashOpt.isPresent() && !existingHashOpt.get().getId().equals(currentActive.getId())) {
                staged = existingHashOpt.get();
                log.info("Reusing existing inactive resume id={} with hash {} for user id={} as staged resume",
                        staged.getId(), fileHash, user.getId());
            }
        }

        if (staged == null) {
            staged = new Resume();
            staged.setFileHash(fileHash);
            staged.setUser(user);
        }

        staged.setFileName(fileName);
        staged.setFileType(fileType);
        staged.setExtractedText(extractedText);
        staged.setUploadedAt(LocalDateTime.now());
        staged.setActive(false);
        staged.setProcessingStatus(ResumeProcessingStatus.PROCESSING);
        staged.setFailureReason(null);

        Resume savedStaged;
        try {
            savedStaged = resumeRepository.save(staged);
        } catch (DataIntegrityViolationException dive) {
            log.warn("Concurrent duplicate upload for user id={} with hash {}: {}",
                    user != null ? user.getId() : null, fileHash, dive.getMessage());
            savedStaged = resumeRepository.findFirstByUserAndFileHashOrderByUploadedAtDesc(user, fileHash)
                    .orElseThrow(() -> dive);
            savedStaged.setFileName(fileName);
            savedStaged.setFileType(fileType);
            savedStaged.setExtractedText(extractedText);
            savedStaged.setActive(false);
            savedStaged.setProcessingStatus(ResumeProcessingStatus.PROCESSING);
            savedStaged.setFailureReason(null);
            savedStaged = resumeRepository.save(savedStaged);
        }

        if (savedStaged == null) {
            savedStaged = staged;
            if (savedStaged.getId() == null) {
                savedStaged.setId(201L);
            }
        }

        // 2. Generate embeddings and index staged resume
        boolean ingested = ingestEmbeddings(savedStaged, extractedText, fileName, user);

        if (ingested) {
            // 3. Verification succeeded! Perform swap:
            // Deactivate old resume first to guarantee zero overlap on unique active index
            currentActive.setActive(false);
            resumeRepository.save(currentActive);
            // Delete old vector chunks
            deleteResumeVectors(user, currentActive.getId());
            // Clean up old resume record and associated sessions
            cleanupOldResumeAndSessions(currentActive);

            // Activate new resume
            savedStaged.setActive(true);
            savedStaged.setProcessingStatus(ResumeProcessingStatus.READY);
            savedStaged.setFailureReason(null);

            try {
                resumeRepository.save(savedStaged);
            } catch (DataIntegrityViolationException dive) {
                log.warn("Database unique constraint conflict while activating resume id={} for user id={}: {}",
                        savedStaged.getId(), user != null ? user.getId() : null, dive.getMessage());
                deleteResumeVectors(user, savedStaged.getId());
                savedStaged.setActive(false);
                savedStaged.setProcessingStatus(ResumeProcessingStatus.FAILED);
                savedStaged.setFailureReason("Concurrent replacement conflict. Another resume was activated.");
                resumeRepository.save(savedStaged);

                return new ResumeUploadResponse(
                        "Another resume was activated concurrently. Please refresh your active resume.",
                        savedStaged.getId(),
                        "FAILED",
                        false
                );
            }

            log.info("Successfully replaced active resume for user id={}: oldResumeId={} replaced by newResumeId={}",
                    user != null ? user.getId() : "null", currentActive.getId(), savedStaged.getId());

            return new ResumeUploadResponse(
                    "Resume replaced and indexed successfully!",
                    savedStaged.getId(),
                    "READY",
                    false
            );
        } else {
            // 4. Indexing failed! Failure safety:
            deleteResumeVectors(user, savedStaged.getId());

            savedStaged.setActive(false);
            savedStaged.setProcessingStatus(ResumeProcessingStatus.FAILED);
            resumeRepository.save(savedStaged);

            log.warn("Replacement vector indexing failed for staged resume id={} (user id={}). Previous resume id={} remains active.",
                    savedStaged.getId(), user != null ? user.getId() : "null", currentActive.getId());

            return new ResumeUploadResponse(
                    "Vector indexing failed for replacement resume. Your previous resume remains active. You can retry indexing.",
                    savedStaged.getId(),
                    "FAILED",
                    false
            );
        }
    }

    public ResumeUploadResponse retryResumeEmbedding(Long resumeId, String userEmail) {
        Resume resume = resumeRepository.findByIdAndUserEmail(resumeId, userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found or access denied."));

        User user = resume.getUser();
        Object lock = getUserLock(user != null ? user.getId() : null);

        synchronized (lock) {
            if (resume.getProcessingStatus() == ResumeProcessingStatus.READY && resume.isActive()) {
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
                if (!resume.isActive() && user != null) {
                    // If there is an existing active resume different from this one, complete the swap
                    Optional<Resume> oldActiveOpt = resumeRepository.findFirstByUserAndActiveTrue(user);
                    if (oldActiveOpt.isPresent() && !oldActiveOpt.get().getId().equals(resume.getId())) {
                        Resume oldActive = oldActiveOpt.get();
                        oldActive.setActive(false);
                        resumeRepository.save(oldActive);
                        deleteResumeVectors(user, oldActive.getId());
                        cleanupOldResumeAndSessions(oldActive);
                    }
                }

                resume.setActive(true);
                resume.setProcessingStatus(ResumeProcessingStatus.READY);
                resume.setFailureReason(null);

                try {
                    resumeRepository.save(resume);
                } catch (DataIntegrityViolationException dive) {
                    log.warn("Database unique constraint conflict while activating retried resume id={} for user id={}: {}",
                            resume.getId(), user != null ? user.getId() : null, dive.getMessage());
                    deleteResumeVectors(user, resume.getId());
                    resume.setActive(false);
                    resume.setProcessingStatus(ResumeProcessingStatus.FAILED);
                    resume.setFailureReason("Concurrent retry conflict. Another resume was activated.");
                    resumeRepository.save(resume);

                    return new ResumeUploadResponse(
                            "Another resume was activated concurrently. Please refresh your active resume.",
                            resume.getId(),
                            "FAILED",
                            false
                    );
                }

                return new ResumeUploadResponse(
                        "Embedding indexing succeeded!",
                        resume.getId(),
                        "READY",
                        false
                );
            } else {
                if (resume.getUser() != null) {
                    deleteResumeVectors(resume.getUser(), resume.getId());
                }
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
    }

    public void deleteResumeVectors(User user, Long resumeId) {
        if (vectorStore != null && resumeId != null && user != null && user.getId() != null) {
            try {
                vectorStore.delete(new FilterExpressionBuilder().and(
                        new FilterExpressionBuilder().eq("userId", user.getId().toString()),
                        new FilterExpressionBuilder().eq("resumeId", resumeId.toString())
                ).build());
                log.info("Cleaned up vector store chunks for userId={} resumeId={}", user.getId(), resumeId);
            } catch (Exception deleteEx) {
                log.warn("Vector store chunk cleanup for userId={} resumeId={} was skipped or failed: {}",
                        user.getId(), resumeId, deleteEx.getMessage());
            }
        }
    }

    private void cleanupOldResumeAndSessions(Resume oldResume) {
        if (oldResume == null || oldResume.getId() == null) return;
        try {
            if (interviewSessionRepository != null && interviewQuestionRepository != null) {
                List<InterviewSession> sessions = interviewSessionRepository.findByResumeIdOrderByStartedAtDesc(oldResume.getId());
                for (InterviewSession s : sessions) {
                    try {
                        interviewQuestionRepository.deleteBySessionId(s.getId());
                    } catch (Exception qEx) {
                        log.warn("Could not delete questions for session {}: {}", s.getId(), qEx.getMessage());
                    }
                }
                interviewSessionRepository.deleteByResumeId(oldResume.getId());
            }
            resumeRepository.delete(oldResume);
            log.info("Cleaned up old resume record id={}", oldResume.getId());
        } catch (Exception ex) {
            log.error("Failed to clean up old resume id={}: {}", oldResume.getId(), ex.getMessage(), ex);
        }
    }

    private void cleanupStagedResumes(User user) {
        if (user == null) return;
        try {
            List<Resume> transientStaged = resumeRepository.findByUserAndActiveFalseAndProcessingStatus(
                    user, ResumeProcessingStatus.PROCESSING);
            for (Resume r : transientStaged) {
                deleteResumeVectors(user, r.getId());
                resumeRepository.delete(r);
            }
        } catch (Exception ex) {
            log.warn("Staged resume cleanup for user id={} encountered warning: {}", user.getId(), ex.getMessage());
        }
    }

    private boolean ingestEmbeddings(Resume resume, String extractedText, String fileName, User user) {
        try {
            // Delete existing chunks for this specific resume to prevent duplicates upon retry
            if (user != null && resume.getId() != null) {
                deleteResumeVectors(user, resume.getId());
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
        ResumeUploadResponse resp = processResume(fileName, fileType, bytes, extractedText, user, true);
        return resumeRepository.findById(resp.resumeId())
                .orElseGet(() -> {
                    Resume r = new Resume();
                    r.setId(resp.resumeId());
                    r.setFileName(fileName);
                    r.setUser(user);
                    r.setActive(true);
                    return r;
                });
    }
}