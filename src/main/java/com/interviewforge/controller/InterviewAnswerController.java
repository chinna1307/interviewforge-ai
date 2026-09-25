package com.interviewforge.controller;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.interviewforge.dto.AnswerEvaluation;
import com.interviewforge.dto.InterviewAnswerRequest;
import com.interviewforge.service.InterviewAnswerService;

@RestController
@RequestMapping("/api/interviews")
public class InterviewAnswerController {

    private final InterviewAnswerService interviewAnswerService;

    public InterviewAnswerController(
            InterviewAnswerService interviewAnswerService) {

        this.interviewAnswerService = interviewAnswerService;
    }

    @PostMapping("/questions/{questionId}/answer")
    public AnswerEvaluation submitAnswer(
            @PathVariable Long questionId,
            @RequestBody InterviewAnswerRequest request) {

        return interviewAnswerService.submitAnswer(
                questionId,
                request
        );
    }
}