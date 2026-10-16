import { apiClient } from "./authService"

export const ACTIVE_SESSION_KEY = "interviewforge_active_session_id"

export const getSavedSessionId = () => {
  const val = localStorage.getItem(ACTIVE_SESSION_KEY)
  return val ? Number(val) : null
}

export const setSavedSessionId = (sessionId) => {
  if (!sessionId) {
    localStorage.removeItem(ACTIVE_SESSION_KEY)
    return
  }
  localStorage.setItem(ACTIVE_SESSION_KEY, String(sessionId))
}

export const startInterview = async (resumeId) => {
  const response = await apiClient.get(`/api/interviews/start/${resumeId}`)
  return response.data
}

export const getInterviewSession = async (sessionId) => {
  const response = await apiClient.get(`/api/interviews/${sessionId}`)
  return response.data
}

export const getInterviewQuestions = async (sessionId) => {
  const response = await apiClient.get(`/api/interviews/${sessionId}/questions`)
  return response.data
}

export const submitInterviewAnswer = async (questionId, answer) => {
  const response = await apiClient.post(
    `/api/interviews/questions/${questionId}/answer`,
    { answer }
  )
  return response.data
}

export const getInterviewResult = async (sessionId) => {
  const response = await apiClient.get(`/api/interviews/${sessionId}/result`)
  return response.data
}

export const getInterviewReport = async (sessionId) => {
  const response = await apiClient.get(`/api/interviews/${sessionId}/report`)
  return response.data
}

export const getInterviewHistory = async () => {
  const response = await apiClient.get("/api/interviews/history")
  return response.data
}
