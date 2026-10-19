package com.interviewforge.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Answers;
import org.springframework.ai.chat.client.ChatClient;

import com.interviewforge.dto.AnswerEvaluation;

class OpenRouterAIProviderTest {

    private ChatClient chatClient;
    private OpenRouterAIProvider openRouterAIProvider;

    @BeforeEach
    void setUp() {
        chatClient = mock(ChatClient.class, Answers.RETURNS_DEEP_STUBS);
        openRouterAIProvider = new OpenRouterAIProvider(chatClient);
    }

    @Test
    void getName_returnsOpenRouter() {
        assertEquals("OpenRouter", openRouterAIProvider.getName());
    }

    @Test
    void chat_stringPrompt_delegatesToChatClientAndReturnsContent() {
        when(chatClient.prompt().user("Tell me about Spring").call().content())
                .thenReturn("Spring is a comprehensive framework.");

        String result = openRouterAIProvider.chat("Tell me about Spring");

        assertEquals("Spring is a comprehensive framework.", result);
    }

    @Test
    void chat_typedPrompt_delegatesToChatClientAndReturnsEntity() {
        AnswerEvaluation expected = new AnswerEvaluation(8, "Solid response.");
        when(chatClient.prompt().user("Evaluate").call().entity(AnswerEvaluation.class))
                .thenReturn(expected);

        AnswerEvaluation result = openRouterAIProvider.chat("Evaluate", AnswerEvaluation.class);

        assertEquals(expected, result);
    }
}
