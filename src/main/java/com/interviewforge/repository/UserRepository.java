package com.interviewforge.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.interviewforge.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {
	boolean existsByEmail(String email);
	
}