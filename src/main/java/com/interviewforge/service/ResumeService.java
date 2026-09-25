package com.interviewforge.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import com.interviewforge.entity.Resume;
import com.interviewforge.entity.User;
import com.interviewforge.repository.ResumeRepository;

@Service
public class ResumeService {

	private final ResumeRepository resumeRepository;
	private final VectorStore vectorStore;

	public ResumeService(ResumeRepository resumeRepository, VectorStore vectorStore) {

		this.resumeRepository = resumeRepository;
		this.vectorStore = vectorStore;
	}

	public Resume saveResume(String fileName, String fileType, String extractedText, User user) {

		Resume resume = new Resume();

		resume.setFileName(fileName);
		resume.setFileType(fileType);
		resume.setExtractedText(extractedText);
		resume.setUploadedAt(LocalDateTime.now());
		resume.setUser(user);

		Resume savedResume = resumeRepository.save(resume);

		Document document = new Document(extractedText,
				Map.of("resumeId", savedResume.getId().toString(), "fileName", fileName, "type", "resume"));

		TokenTextSplitter splitter = new TokenTextSplitter();

		List<Document> chunks = splitter.apply(List.of(document));

		vectorStore.add(chunks);

		return savedResume;
	}
}