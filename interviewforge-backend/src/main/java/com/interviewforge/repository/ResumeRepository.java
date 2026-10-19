package com.interviewforge.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.interviewforge.entity.Resume;
import com.interviewforge.entity.User;

public interface ResumeRepository extends JpaRepository<Resume, Long> {
    List<Resume> findByUserEmailOrderByUploadedAtDesc(String email);
    Optional<Resume> findByIdAndUserEmail(Long id, String email);
    Optional<Resume> findFirstByUserAndFileHashOrderByUploadedAtDesc(User user, String fileHash);
    Optional<Resume> findFirstByUserEmailAndFileHashOrderByUploadedAtDesc(String email, String fileHash);
    Optional<Resume> findFirstByUserAndActiveTrue(User user);
    Optional<Resume> findFirstByUserEmailAndActiveTrue(String email);
    List<Resume> findByUserEmailAndActiveTrue(String email);
    Optional<Resume> findByIdAndUserEmailAndActiveTrue(Long id, String email);
    List<Resume> findByUserAndActiveFalse(User user);
    List<Resume> findByUserAndActiveFalseAndProcessingStatus(User user, com.interviewforge.entity.ResumeProcessingStatus processingStatus);
}