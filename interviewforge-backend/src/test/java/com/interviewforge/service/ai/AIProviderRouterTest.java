package com.interviewforge.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.interviewforge.dto.ResumeAnalysis;

class AIProviderRouterTest {

    private GroqAIProvider groqProvider;
    private OpenRouterAIProvider openRouterProvider;
    private AIProviderRouter router;

    @BeforeEach
    void setUp() {
        groqProvider = mock(GroqAIProvider.class);
        openRouterProvider = mock(OpenRouterAIProvider.class);
        router = new AIProviderRouter(groqProvider, openRouterProvider);
    }

    @Test
    void testGroqSuccess_stringChat_returnsDirectlyWithoutFallback() {
        when(groqProvider.chat("Hello")).thenReturn("Groq response");

        String result = router.chat("Hello");

        assertEquals("Groq response", result);
        verify(openRouterProvider, never()).chat(any());
    }

    @Test
    void testGroqFailure_stringChat_fallsBackToOpenRouterSuccessfully() {
        when(groqProvider.chat("Hello")).thenThrow(new RuntimeException("Groq 404 Model Not Found"));
        when(openRouterProvider.chat("Hello")).thenReturn("OpenRouter response");

        String result = router.chat("Hello");

        assertEquals("OpenRouter response", result);
        verify(openRouterProvider).chat("Hello");
    }

    @Test
    void testGroqSuccess_entityChat_returnsDirectlyWithoutFallback() {
        ResumeAnalysis mockAnalysis = new ResumeAnalysis(null, null, null, null, null, null);
        when(groqProvider.chat(eq("Analyze"), eq(ResumeAnalysis.class))).thenReturn(mockAnalysis);

        ResumeAnalysis result = router.chat("Analyze", ResumeAnalysis.class);

        assertEquals(mockAnalysis, result);
        verify(openRouterProvider, never()).chat(any(), eq(ResumeAnalysis.class));
    }

    @Test
    void testGroqFailure_entityChat_fallsBackToOpenRouterSuccessfully() {
        ResumeAnalysis mockAnalysis = new ResumeAnalysis(null, null, null, null, null, null);
        when(groqProvider.chat(eq("Analyze"), eq(ResumeAnalysis.class)))
                .thenThrow(new RuntimeException("Groq 429 Rate Limit Exceeded"));
        when(openRouterProvider.chat(eq("Analyze"), eq(ResumeAnalysis.class))).thenReturn(mockAnalysis);

        ResumeAnalysis result = router.chat("Analyze", ResumeAnalysis.class);

        assertEquals(mockAnalysis, result);
        verify(openRouterProvider).chat("Analyze", ResumeAnalysis.class);
    }

    @Test
    void testBothProvidersFail_throwsExceptionWithDetails() {
        when(groqProvider.chat("Hello")).thenThrow(new RuntimeException("Groq error"));
        when(openRouterProvider.chat("Hello")).thenThrow(new RuntimeException("OpenRouter error"));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> router.chat("Hello"));
        assertEquals("OpenRouter error", ex.getMessage());
    }
}
