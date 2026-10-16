import axios from "axios"

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
const TOKEN_KEY = "interviewforge_token"
const USER_KEY = "interviewforge_user"

export const setAuthToken = (token) => {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY)
    return
  }
  localStorage.setItem(TOKEN_KEY, token)
}

export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY)
}

export const setStoredUser = (user) => {
  if (!user) {
    localStorage.removeItem(USER_KEY)
    return
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

const isTokenExpired = (token) => {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return false
    const payload = JSON.parse(atob(parts[1]))
    if (!payload.exp) return false
    return Date.now() >= payload.exp * 1000
  } catch {
    return false
  }
}

export const isAuthenticated = () => {
  const token = getAuthToken()
  if (!token) return false
  if (isTokenExpired(token)) {
    clearAuthToken()
    return false
  }
  return true
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthToken()
      if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
        window.location.href = "/login?expired=true"
      }
    }
    return Promise.reject(error)
  }
)

export const registerUser = async (userData) => {
  try {
    const response = await apiClient.post("/api/auth/register", userData)
    return response.data
  } catch (err) {
    if (err?.response?.status === 404 || err?.response?.status === 415) {
      const formData = new URLSearchParams()
      formData.append("name", userData.name)
      formData.append("email", userData.email)
      formData.append("password", userData.password)
      const fallback = await axios.post(`${API_BASE_URL}/register`, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
      return fallback.data
    }
    throw err
  }
}

export const loginUser = async (credentials) => {
  try {
    const jsonRes = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: credentials.email,
      password: credentials.password,
    })
    const data = jsonRes.data
    const token = data?.token || data?.jwt
    if (token) {
      setAuthToken(token.trim())
      setStoredUser({
        email: data.email || credentials.email,
        name: data.name || credentials.email.split("@")[0],
        role: data.role || "CANDIDATE",
      })
      return { token: token.trim(), user: data }
    }
  } catch (err) {
    if (err?.response?.status === 401 || err?.response?.status === 400) {
      throw err
    }
  }

  const formData = new URLSearchParams()
  formData.append("email", credentials.email)
  formData.append("password", credentials.password)

  const response = await axios.post(`${API_BASE_URL}/login`, formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    responseType: "text",
  })

  const rawResponse = typeof response.data === "string" ? response.data.trim() : response.data
  let token = rawResponse

  if (typeof rawResponse === "string" && rawResponse.startsWith("{")) {
    const data = JSON.parse(rawResponse)
    token = data.token || data.jwt
  } else if (rawResponse && typeof rawResponse === "object") {
    token = rawResponse.token || rawResponse.jwt
  }

  if (typeof token !== "string" || !token.trim()) {
    throw new Error("Authentication token not returned by server.")
  }

  setAuthToken(token.trim())
  setStoredUser({
    email: credentials.email,
    name: credentials.email.split("@")[0],
    role: "CANDIDATE",
  })
  return { token: token.trim() }
}

export const fetchCurrentUser = async () => {
  const response = await apiClient.get("/api/auth/me")
  setStoredUser(response.data)
  return response.data
}
