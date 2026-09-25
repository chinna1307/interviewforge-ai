package com.interviewforge.service.ai;

public interface AIProvider {

    String getName();

    String chat(String prompt);

    <T> T chat(String prompt, Class<T> responseType);
}