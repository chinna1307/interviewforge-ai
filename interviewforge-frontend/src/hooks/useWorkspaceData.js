import { useCallback, useEffect, useMemo, useState } from "react"

import { getStoredUser } from "../services/authService"
import { loadWorkspaceData } from "../lib/workspaceApi"
import {
  currentStreak,
  isCompleted,
  scoreSeries,
  summariseSessions,
  weeklyActivity,
} from "../lib/metrics"

const EMPTY = {
  user: null,
  resumes: [],
  sessions: [],
  categoryScores: [],
  error: "",
}

const nameOf = (user) => user?.name || user?.email?.split("@")[0] || "Candidate"

/**
 * Single source of truth for authenticated workspace data.
 * Loaded once by WorkspaceProvider so the shell, dashboard and history pages
 * never issue duplicate requests.
 */
export default function useWorkspaceData() {
  const [data, setData] = useState(() => ({
    ...EMPTY,
    user: getStoredUser(),
    isLoading: true,
  }))

  const applyResult = useCallback((result) => {
    setData({
      user: result.user || getStoredUser(),
      resumes: result.resumes,
      sessions: result.sessions,
      categoryScores: result.categoryScores,
      error: result.error,
      isLoading: false,
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    loadWorkspaceData()
      .then((result) => {
        if (!cancelled) applyResult(result)
      })
      .catch(() => {
        if (!cancelled) {
          setData((previous) => ({ ...previous, isLoading: false }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [applyResult])

  const refresh = useCallback(async () => {
    setData((previous) => ({ ...previous, isLoading: true }))
    try {
      applyResult(await loadWorkspaceData())
    } catch {
      setData((previous) => ({ ...previous, isLoading: false }))
    }
  }, [applyResult])

  const stats = useMemo(
    () => summariseSessions(data.sessions),
    [data.sessions],
  )

  const derived = useMemo(() => {
    const displayName = nameOf(data.user)
    return {
      streak: currentStreak(data.sessions),
      weekly: weeklyActivity(data.sessions),
      scoreSeries: scoreSeries(data.sessions),
      latestSession: data.sessions[0] ?? null,
      activeSession: data.sessions.find((session) => !isCompleted(session)) ?? null,
      latestCompleted: data.sessions.find((session) => isCompleted(session)) ?? null,
      displayName,
      initials: displayName.trim().charAt(0).toUpperCase(),
      role: data.user?.role || "CANDIDATE",
    }
  }, [data.sessions, data.user])

  return {
    user: data.user,
    resumes: data.resumes,
    sessions: data.sessions,
    categoryScores: data.categoryScores,
    stats,
    isLoading: data.isLoading,
    error: data.error,
    refresh,
    ...derived,
  }
}