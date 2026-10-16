import { apiClient } from "./authService"

export const RESUME_ID_KEY = "interviewforge_resume_id"
export const RESUME_META_KEY = "interviewforge_resume_meta"

export const getSavedResumeId = () => {
  const id = localStorage.getItem(RESUME_ID_KEY)
  return id ? Number(id) : null
}

export const saveResumeMeta = (meta) => {
  if (!meta) return
  if (meta.resumeId) {
    localStorage.setItem(RESUME_ID_KEY, String(meta.resumeId))
  }
  localStorage.setItem(RESUME_META_KEY, JSON.stringify(meta))
}

export const getSavedResumeMeta = () => {
  try {
    const raw = localStorage.getItem(RESUME_META_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const getCachedAnalysis = (resumeId) => {
  if (!resumeId) return null
  try {
    const raw = localStorage.getItem(`interviewforge_analysis_${resumeId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const setCachedAnalysis = (resumeId, analysis) => {
  if (!resumeId || !analysis) return
  try {
    localStorage.setItem(`interviewforge_analysis_${resumeId}`, JSON.stringify(analysis))
  } catch {
    // Ignore storage quota errors
  }
}

export const uploadResume = async (file) => {
  const formData = new FormData()
  formData.append("file", file)

  const response = await apiClient.post("/api/resumes/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })

  return response.data
}

export const getResumeAnalysis = async (resumeId) => {
  const response = await apiClient.get(`/api/resumes/${resumeId}/analysis`)
  setCachedAnalysis(resumeId, response.data)
  return response.data
}

export const getMyResumes = async () => {
  const response = await apiClient.get("/api/resumes/my")
  return response.data
}

export const analyzeResume = getResumeAnalysis