import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { useWorkspace } from "../context/workspace"
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeading,
  Skeleton,
  StatusBadge,
} from "../components/ui"
import { cx } from "../lib/cx"
import {
  IconArrowRight,
  IconChart,
  IconHistory,
  IconMic,
  IconSearch,
} from "../components/Icons"
import { formatRelative, isCompleted } from "../lib/metrics"

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "in-progress", label: "In progress" },
]

const SORT_OPTIONS = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "score-high", label: "Highest score" },
  { key: "score-low", label: "Lowest score" },
]

const PAGE_SIZE = 8

function scoreTone(score) {
  if (score >= 7) return "success"
  if (score >= 4) return "warning"
  return "danger"
}

export default function History() {
  const navigate = useNavigate()
  const { sessions, isLoading, error, refresh } = useWorkspace()

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()

    const matches = sessions.filter((session) => {
      const completed = isCompleted(session)
      if (statusFilter === "completed" && !completed) return false
      if (statusFilter === "in-progress" && completed) return false
      if (!term) return true
      return (
        String(session.sessionId).includes(term) ||
        String(session.resumeFileName || "")
          .toLowerCase()
          .includes(term) ||
        String(session.status || "")
          .toLowerCase()
          .includes(term)
      )
    })

    const sorted = [...matches]
    switch (sortBy) {
      case "oldest":
        sorted.sort((a, b) => new Date(a.startedAt || 0) - new Date(b.startedAt || 0))
        break
      case "score-high":
        sorted.sort((a, b) => Number(b.averageScore) - Number(a.averageScore))
        break
      case "score-low":
        sorted.sort((a, b) => Number(a.averageScore) - Number(b.averageScore))
        break
      default:
        sorted.sort((a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0))
    }

    return sorted
  }, [sessions, query, statusFilter, sortBy])

  const visible = filtered.slice(0, visibleCount)

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="History"
        title="Interview history"
        description="Every mock interview on your account, with real scores from the AI evaluator."
        actions={
          <Button onClick={() => navigate("/interview")}>
            <IconMic size={15} />
            Start new interview
          </Button>
        }
      />

      {error && <ErrorState message={error} onRetry={refresh} />}

      {/* Controls */}
      {!isLoading && sessions.length > 0 && (
        <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <label htmlFor="history-search" className="sr-only">
              Search sessions
            </label>
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
              <IconSearch size={15} />
            </span>
            <input
              id="history-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setVisibleCount(PAGE_SIZE)
              }}
              placeholder="Search by session number or resume name…"
              className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-faint transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/12 focus:outline-none"
            />
          </div>

          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => {
                  setStatusFilter(filter.key)
                  setVisibleCount(PAGE_SIZE)
                }}
                aria-pressed={statusFilter === filter.key}
                className={cx(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  statusFilter === filter.key
                    ? "bg-brand-500 text-white"
                    : "border border-line text-ink-muted hover:border-brand-300 hover:text-brand-600",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="history-sort" className="sr-only">
              Sort sessions
            </label>
            <select
              id="history-sort"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-soft transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/12 focus:outline-none lg:w-auto"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="flex items-center gap-5 p-6">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-2.5 w-2/3" />
              </div>
              <Skeleton className="hidden h-10 w-24 rounded-xl sm:block" />
            </Card>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={<IconHistory size={24} />}
            title="No interview sessions yet"
            description="Your sessions will appear here with scores, statuses and links to the full AI report."
            action={
              <button
                type="button"
                onClick={() => navigate("/interview")}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Start mock interview
                <IconArrowRight size={15} />
              </button>
            }
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={<IconSearch size={24} />}
            title="No sessions match those filters"
            description="Try a different search term or reset the status filter."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("")
                  setStatusFilter("all")
                }}
              >
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {visible.map((session) => {
              const completed = isCompleted(session)
              const score = Number(session.averageScore) || 0

              return (
                <Card
                  key={session.sessionId}
                  className="flex flex-col gap-4 p-5 transition-shadow duration-200 hover:shadow-card-hover lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <span
                      className={cx(
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold tabular-nums",
                        completed
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-300",
                      )}
                    >
                      #{session.sessionId}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-ink">
                          {session.resumeFileName
                            ? `Mock interview · ${session.resumeFileName}`
                            : `Mock interview session ${session.sessionId}`}
                        </h3>
                        <StatusBadge status={session.status} />
                      </div>

                      <p className="mt-1 text-[11px] text-ink-muted">
                        {formatRelative(session.startedAt)} ·{" "}
                        {session.answeredQuestions}/{session.totalQuestions}{" "}
                        answered
                      </p>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <Badge tone={scoreTone(score)}>
                          {completed && score > 0
                            ? `${score.toFixed(2)} / 10`
                            : "Not scored"}
                        </Badge>
                        <Badge tone="neutral">Resume #{session.resumeId}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        navigate(`/interview?sessionId=${session.sessionId}`)
                      }
                      icon={completed ? <IconHistory size={14} /> : <IconMic size={14} />}
                    >
                      {completed ? "Review answers" : "Continue"}
                    </Button>

                    {completed && (
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/interview?sessionId=${session.sessionId}&tab=report`,
                          )
                        }
                        icon={<IconChart size={14} />}
                      >
                        AI report
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          {filtered.length > visible.length && (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                Load {Math.min(PAGE_SIZE, filtered.length - visible.length)} more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}