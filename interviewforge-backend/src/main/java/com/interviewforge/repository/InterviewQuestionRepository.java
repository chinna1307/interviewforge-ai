package com.interviewforge.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.interviewforge.entity.InterviewQuestionEntity;

public interface InterviewQuestionRepository
        extends JpaRepository<InterviewQuestionEntity, Long> {

    List<InterviewQuestionEntity> findBySessionIdOrderByQuestionNumber(
            Long sessionId
    );
}