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

export const clearResumeMeta = () => {
  localStorage.removeItem(RESUME_ID_KEY)
  localStorage.removeItem(RESUME_META_KEY)
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

export const clearCachedAnalysis = (resumeId) => {
  if (!resumeId) return
  try {
    localStorage.removeItem(`interviewforge_analysis_${resumeId}`)
  } catch {
    // Ignore storage errors
  }
}

export const uploadResume = async (file, replace = false) => {
  const formData = new FormData()
  formData.append("file", file)

  const url = replace ? "/api/resumes/upload?replace=true" : "/api/resumes/upload"
  const response = await apiClient.post(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })

  return response.data
}

export const replaceResume = async (file) => {
  const formData = new FormData()
  formData.append("file", file)

  const response = await apiClient.post("/api/resumes/replace", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })

  return response.data
}

export const getCurrentResume = async () => {
  const response = await apiClient.get("/api/resumes/current")
  return response.data
}

export const getResumeAnalysis = async (resumeId) => {
  const url = resumeId ? `/api/resumes/${resumeId}/analysis` : "/api/resumes/analysis"
  const response = await apiClient.get(url)
  if (resumeId) {
    setCachedAnalysis(resumeId, response.data)
  }
  return response.data
}

export const getMyResumes = async () => {
  const response = await apiClient.get("/api/resumes/my")
  return response.data
}

export const retryResume = async (resumeId) => {
  const response = await apiClient.post(`/api/resumes/${resumeId}/retry`)
  return response.data
}

export const analyzeResume = getResumeAnalysis