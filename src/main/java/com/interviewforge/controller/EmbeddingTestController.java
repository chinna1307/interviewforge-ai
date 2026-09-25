package com.interviewforge.controller;

import java.util.List;
import java.util.Map;

import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.ai.vectorstore.SearchRequest;

@RestController
@RequestMapping("/api/ai")
public class EmbeddingTestController {

    private final EmbeddingModel embeddingModel;
    private final VectorStore vectorStore;

    public EmbeddingTestController(
            EmbeddingModel embeddingModel,
            VectorStore vectorStore) {

        this.embeddingModel = embeddingModel;
        this.vectorStore = vectorStore;
    }

    @GetMapping("/embedding")
    public Map<String, Object> testEmbedding(
            @RequestParam(defaultValue = "Java Spring Boot developer") String text) {

        EmbeddingResponse response =
                embeddingModel.embedForResponse(List.of(text));

        float[] embedding = response.getResults()
                .get(0)
                .getOutput();

        return Map.of(
                "text", text,
                "dimensions", embedding.length,
                "firstValues", List.of(
                        embedding[0],
                        embedding[1],
                        embedding[2],
                        embedding[3],
                        embedding[4]
                )
        );
    }

    @GetMapping("/vector-store")
    public String testVectorStore() {

        List<Document> documents = List.of(
                new Document(
                        "Java Spring Boot developer with PostgreSQL experience",
                        Map.of("type", "test")
                ),
                new Document(
                        "React frontend developer with JavaScript and TypeScript skills",
                        Map.of("type", "test")
                ),
                new Document(
                        "Python developer experienced in machine learning and AI",
                        Map.of("type", "test")
                )
        );

        vectorStore.add(documents);

        return "Documents successfully stored in PGVector";
    }

    @GetMapping("/search")
    public List<Document> search(
            @RequestParam(defaultValue = "Java backend developer") String query) {

        return vectorStore.similaritySearch(
                SearchRequest.builder()
                        .query(query)
                        .topK(3)
                        .build()
        );
    }
}