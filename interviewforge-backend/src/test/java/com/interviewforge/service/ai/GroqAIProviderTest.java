package com.interviewforge.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Answers;
import org.springframework.ai.chat.client.ChatClient;

import com.interviewforge.dto.AnswerEvaluation;

class GroqAIProviderTest {

    private ChatClient chatClient;
    private GroqAIProvider groqAIProvider;

    @BeforeEach
    void setUp() {
        chatClient = mock(ChatClient.class, Answers.RETURNS_DEEP_STUBS);
        groqAIProvider = new GroqAIProvider(chatClient);
    }

    @Test
    void getName_returnsGroq() {
        assertEquals("Groq", groqAIProvider.getName());
    }

    @Test
    void chat_stringPrompt_delegatesToChatClientAndReturnsContent() {
        when(chatClient.prompt().user("Tell me about Java").call().content())
                .thenReturn("Java is a high-level language.");

        String result = groqAIProvider.chat("Tell me about Java");

        assertEquals("Java is a high-level language.", result);
    }

    @Test
    void chat_typedPrompt_delegatesToChatClientAndReturnsEntity() {
        AnswerEvaluation expected = new AnswerEvaluation(9, "Great explanation.");
        when(chatClient.prompt().user("Evaluate").call().entity(AnswerEvaluation.class))
                .thenReturn(expected);

        AnswerEvaluation result = groqAIProvider.chat("Evaluate", AnswerEvaluation.class);

        assertEquals(expected, result);
    }
}
