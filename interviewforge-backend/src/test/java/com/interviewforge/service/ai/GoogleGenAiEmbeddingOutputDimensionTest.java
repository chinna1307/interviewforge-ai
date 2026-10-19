package com.interviewforge.service.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.google.genai.embedding.GoogleGenAiEmbeddingConnectionDetails;
import org.springframework.ai.google.genai.text.GoogleGenAiTextEmbeddingModel;
import org.springframework.ai.google.genai.text.GoogleGenAiTextEmbeddingOptions;

import com.google.genai.Client;
import com.google.genai.Models;
import com.google.genai.types.ContentEmbedding;
import com.google.genai.types.EmbedContentConfig;
import com.google.genai.types.EmbedContentResponse;

class GoogleGenAiEmbeddingOutputDimensionTest {

    @Test
    void embed_geminiEmbedding001_sendsOutputDimensionality768AndReturns768Floats() throws Exception {
        // 1. Mock Client and wire models field via Unsafe
        Client mockClient = mock(Client.class);
        Models mockModels = mock(Models.class);

        Field unsafeField = sun.misc.Unsafe.class.getDeclaredField("theUnsafe");
        unsafeField.setAccessible(true);
        sun.misc.Unsafe unsafe = (sun.misc.Unsafe) unsafeField.get(null);
        long offset = unsafe.objectFieldOffset(Client.class.getDeclaredField("models"));
        unsafe.putObject(mockClient, offset, mockModels);

        GoogleGenAiEmbeddingConnectionDetails connectionDetails = mock(GoogleGenAiEmbeddingConnectionDetails.class);
        when(connectionDetails.getGenAiClient()).thenReturn(mockClient);
        when(connectionDetails.getModelEndpointName("gemini-embedding-001")).thenReturn("models/gemini-embedding-001");

        // 2. Configure model with dimensions = 768
        GoogleGenAiTextEmbeddingOptions options = GoogleGenAiTextEmbeddingOptions.builder()
                .model("gemini-embedding-001")
                .dimensions(768)
                .build();

        // 3. Prepare mock Google response with 768 values
        List<Float> mockValues = new ArrayList<>(768);
        for (int i = 0; i < 768; i++) {
            mockValues.add(0.01f * (i % 100));
        }

        ContentEmbedding contentEmbedding = ContentEmbedding.builder()
                .values(mockValues)
                .build();

        EmbedContentResponse mockResponse = EmbedContentResponse.builder()
                .embeddings(List.of(contentEmbedding))
                .build();

        ArgumentCaptor<EmbedContentConfig> configCaptor = ArgumentCaptor.forClass(EmbedContentConfig.class);
        when(mockModels.embedContent(eq("models/gemini-embedding-001"), anyList(), configCaptor.capture()))
                .thenReturn(mockResponse);

        GoogleGenAiTextEmbeddingModel embeddingModel = new GoogleGenAiTextEmbeddingModel(connectionDetails, options);

        // 4. Execute embedding
        float[] resultVector = embeddingModel.embed("Candidate has 5 years of Java Spring Boot experience");

        // 5. Verify that outputDimensionality(768) was passed to the Google API
        verify(mockModels).embedContent(eq("models/gemini-embedding-001"), anyList(), any(EmbedContentConfig.class));
        EmbedContentConfig capturedConfig = configCaptor.getValue();
        assertNotNull(capturedConfig, "EmbedContentConfig must not be null");
        assertTrue(capturedConfig.outputDimensionality().isPresent(), "outputDimensionality must be present");
        assertEquals(768, capturedConfig.outputDimensionality().get(), "Google outputDimensionality must be exactly 768");

        // 6. Verify that the returned vector array contains exactly 768 values
        assertNotNull(resultVector);
        assertEquals(768, resultVector.length, "Returned embedding vector must have length 768");
    }
}