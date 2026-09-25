package com.interviewforge.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.interviewforge.entity.InterviewSession;

public interface InterviewSessionRepository
        extends JpaRepository<InterviewSession, Long> {
}