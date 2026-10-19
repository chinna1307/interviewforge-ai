package com.interviewforge.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.interviewforge.entity.InterviewSession;

public interface InterviewSessionRepository extends JpaRepository<InterviewSession, Long> {
    List<InterviewSession> findByResumeIdInOrderByStartedAtDesc(List<Long> resumeIds);
    List<InterviewSession> findByResumeIdOrderByStartedAtDesc(Long resumeId);
    void deleteByResumeId(Long resumeId);
}