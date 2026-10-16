package com.interviewforge.service;

import java.time.LocalDateTime;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.interviewforge.entity.User;
import com.interviewforge.repository.UserRepository;

@Service
public class UserService {

	private final UserRepository userRepository;

	private final PasswordEncoder passwordEncoder;

	public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {

		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
	}

	public User registerUser(User user) {

		if (userRepository.existsByEmail(user.getEmail())) {
			throw new RuntimeException("Email already registered");

		}
		user.setPassword(passwordEncoder.encode(user.getPassword()));

		user.setRole("CANDIDATE");

		user.setCreatedAt(LocalDateTime.now());
		return userRepository.save(user);
	}

	public User loginUser(String email, String password) {

		User user = userRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Invalid email or password"));

		if (!passwordEncoder.matches(password, user.getPassword())) {
			throw new RuntimeException("Invalid email or password");
		}

		return user;
	}
}