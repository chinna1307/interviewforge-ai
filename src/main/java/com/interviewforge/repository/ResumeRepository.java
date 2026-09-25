package com.interviewforge.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.interviewforge.entity.Resume;

public interface ResumeRepository extends JpaRepository<Resume, Long> {
}