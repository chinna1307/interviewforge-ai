/**
 * Pure aggregation helpers built on the real backend payloads.
 * Nothing in here invents data — every value is derived from
 * SessionSummaryDto / InterviewQuestionEntity records.
 */

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export const isCompleted = (session) =>
  session?.status === "COMPLETED" ||
  (Number(session?.totalQuestions) > 0 &&
    Number(session?.answeredQuestions) >= Number(session?.totalQuestions))

export const toDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const localDateKey = (date) => {
  const d = toDate(date)
  if (!d) return null
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${month}-${day}`
}

export const byNewestFirst = (a, b) => {
  const da = toDate(a?.startedAt)?.getTime() ?? 0
  const db = toDate(b?.startedAt)?.getTime() ?? 0
  if (db !== da) return db - da
  return Number(b?.sessionId ?? 0) - Number(a?.sessionId ?? 0)
}

export const formatDate = (value) => {
  const d = toDate(value)
  if (!d) return "—"
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export const formatRelative = (value) => {
  const d = toDate(value)
  if (!d) return "—"
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (diffDays <= 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays < 14 ? "" : "s"} ago`
  return formatDate(d)
}

const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/* ---------------------------------------------------------------- */

export function summariseSessions(sessions = []) {
  const list = Array.isArray(sessions) ? sessions : []
  const completed = list.filter(isCompleted)

  const questionsSolved = list.reduce(
    (sum, s) => sum + toNumber(s.answeredQuestions),
    0,
  )
  const questionsOffered = list.reduce(
    (sum, s) => sum + toNumber(s.totalQuestions),
    0,
  )

  const scored = completed.filter((s) => toNumber(s.averageScore) > 0)
  const avgScore = scored.length
    ? scored.reduce((sum, s) => sum + toNumber(s.averageScore), 0) / scored.length
    : 0

  const best = scored.length
    ? Math.max(...scored.map((s) => toNumber(s.averageScore)))
    : 0

  const first = scored.length
    ? scored[scored.length - 1]?.averageScore
    : 0

  const improvement =
    scored.length >= 2 ? toNumber(avgScore) - toNumber(first) : null

  return {
    totalSessions: list.length,
    completedSessions: completed.length,
    inProgressSessions: list.length - completed.length,
    questionsSolved,
    questionsOffered,
    completionRate: questionsOffered
      ? Math.round((questionsSolved / questionsOffered) * 100)
      : 0,
    sessionCompletionRate: list.length
      ? Math.round((completed.length / list.length) * 100)
      : 0,
    avgScore,
    bestScore: best,
    hasScores: scored.length > 0,
    improvement,
  }
}

/** Oldest → newest, so sparklines read left to right. */
export function scoreSeries(sessions = []) {
  return [...(sessions || [])]
    .filter((s) => isCompleted(s) && toNumber(s.averageScore) > 0)
    .sort((a, b) => (toDate(a.startedAt)?.getTime() ?? 0) - (toDate(b.startedAt)?.getTime() ?? 0))
    .map((s) => Number(toNumber(s.averageScore).toFixed(2)))
}

export function answeredSeries(sessions = []) {
  return [...(sessions || [])]
    .sort((a, b) => (toDate(a.startedAt)?.getTime() ?? 0) - (toDate(b.startedAt)?.getTime() ?? 0))
    .map((s) => toNumber(s.answeredQuestions))
}

/** Consecutive practice days ending today (or yesterday, so the badge never lies). */
export function currentStreak(sessions = []) {
  const dates = new Set(
    (sessions || [])
      .map((s) => localDateKey(s.startedAt))
      .filter(Boolean),
  )
  if (dates.size === 0) return 0

  const cursor = new Date()
  const todayKey = localDateKey(cursor)
  if (!dates.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1)
    if (!dates.has(localDateKey(cursor))) return 0
  }

  let streak = 0
  while (dates.has(localDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** Real interview counts for the current Monday→Sunday week. */
export function weeklyActivity(sessions = [], now = new Date()) {
  const start = new Date(now)
  const dayIndex = (start.getDay() + 6) % 7
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - dayIndex)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  const buckets = DAY_LABELS.map((label) => ({ label, value: 0 }))

  for (const session of sessions || []) {
    const date = toDate(session.startedAt)
    if (!date || date < start || date >= end) continue
    buckets[date.getDay() === 0 ? 6 : date.getDay() - 1].value += 1
  }

  return buckets
}

/**
 * Groups real per-question scores by the AI-assigned question category.
 * `questionsBySession` is a flat list of InterviewQuestionEntity records.
 */
export function aggregateByCategory(questions = []) {
  const buckets = new Map()

  for (const q of questions || []) {
    if (!q?.answered) continue
    const score = Number(q.score)
    if (!Number.isFinite(score) || score <= 0) continue

    const key = (q.category || "General").trim() || "General"
    if (!buckets.has(key)) buckets.set(key, { label: key, total: 0, count: 0 })
    const bucket = buckets.get(key)
    bucket.total += score
    bucket.count += 1
  }

  return [...buckets.values()]
    .map((b) => ({
      label: b.label,
      value: Number((b.total / b.count).toFixed(2)),
      answers: b.count,
    }))
    .sort((a, b) => b.value - a.value)
}