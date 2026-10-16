import {
  fetchCurrentUser,
} from "../services/authService"
import { getMyResumes } from "../services/resumeService"
import {
  getInterviewHistory,
  getInterviewQuestions,
} from "../services/interviewService"

import {
  aggregateByCategory,
  byNewestFirst,
  isCompleted,
} from "./metrics"

export const MAX_SESSIONS_FOR_CATEGORY_SCAN = 8

/**
 * Pure data-access orchestration: no React involved, so the hook that calls it
 * can safely update state from a promise callback.
 *
 * Every value returned originates from a real backend response.
 */
export async function loadWorkspaceData() {
  const [profileResult, resumeResult, historyResult] = await Promise.allSettled([
    fetchCurrentUser(),
    getMyResumes(),
    getInterviewHistory(),
  ])

  const user =
    profileResult.status === "fulfilled" && profileResult.value
      ? profileResult.value
      : null

  const resumes =
    resumeResult.status === "fulfilled" && Array.isArray(resumeResult.value)
      ? resumeResult.value
      : []

  const sessions =
    historyResult.status === "fulfilled" && Array.isArray(historyResult.value)
      ? [...historyResult.value].sort(byNewestFirst)
      : []

  const error =
    historyResult.status === "rejected"
      ? historyResult.reason?.response?.data?.message ||
        "Could not load interview history from the server."
      : ""

  // Skill breakdown needs per-question scores, which only the questions
  // endpoint exposes. Scanned for the most recent completed sessions only.
  const scanTargets = sessions
    .filter(isCompleted)
    .slice(0, MAX_SESSIONS_FOR_CATEGORY_SCAN)

  let categoryScores = []
  if (scanTargets.length > 0) {
    const questionSets = await Promise.allSettled(
      scanTargets.map((session) => getInterviewQuestions(session.sessionId)),
    )
    const flatQuestions = questionSets
      .filter((result) => result.status === "fulfilled" && Array.isArray(result.value))
      .flatMap((result) => result.value)
    categoryScores = aggregateByCategory(flatQuestions)
  }

  return { user, resumes, sessions, categoryScores, error }
}