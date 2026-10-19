import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import {
  getInterviewQuestions,
  getInterviewReport,
  getInterviewResult,
  getInterviewSession,
  getSavedSessionId,
  setSavedSessionId,
  startInterview,
  submitInterviewAnswer,
} from "../services/interviewService"
import {
  getCurrentResume,
  retryResume,
  saveResumeMeta,
} from "../services/resumeService"
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeading,
  Spinner,
} from "../components/ui"
import { cx } from "../lib/cx"
import { EMERALD, ScoreRing } from "../components/charts"
import {
  IconAlert,
  IconArrowLeft,
  IconArrowRight,
  IconBolt,
  IconCheck,
  IconChat,
  IconMic,
  IconRefresh,
  IconResume,
  IconTarget,
  IconUpload,
} from "../components/Icons"
import { formatDate } from "../lib/metrics"

const DIFFICULTY_TONES = {
  Easy: { chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/12 dark:text-emerald-300", dot: "bg-emerald-500" },
  Medium: { chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/12 dark:text-amber-300", dot: "bg-amber-500" },
  Hard: { chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/12 dark:text-red-300", dot: "bg-red-500" },
}

function difficultyTone(difficulty) {
  return (
    DIFFICULTY_TONES[difficulty] || {
      chip: "border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/12 dark:text-brand-300",
      dot: "bg-brand-500",
    }
  )
}

/* --------------------------------- Setup --------------------------------- */

function SetupView({
  activeResume,
  onStart,
  isStarting,
  onRetry,
  isRetrying,
  onRefresh,
  isRefreshing,
}) {
  if (!activeResume || !activeResume.id) {
    return (
      <Card className="p-0">
        <EmptyState
          icon={<IconUpload size={24} />}
          title="Upload a resume to unlock mock interviews"
          description="Every question is generated from your active resume through retrieval-augmented generation. Upload your resume to begin practicing."
          action={
            <Link
              to="/resume"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Upload resume
              <IconArrowRight size={15} />
            </Link>
          }
        />
      </Card>
    )
  }

  const isReady = activeResume.status === "READY"
  const isFailed = activeResume.status === "FAILED"
  const isPending = !isReady && !isFailed

  return (
    <Card className="p-6 sm:p-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/12">
            <IconMic size={22} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Ready to begin your mock interview
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
              InterviewForge generates 5 personalized questions from your active resume, covering
              technical depth, your projects, Java/backend, and problem solving.
              Answer each one to receive an instant score out of 10 and written feedback.
            </p>
          </div>
        </div>

        <ul className="grid gap-2.5 sm:grid-cols-2">
          {[
            { icon: IconBolt, text: "5 personalized questions" },
            { icon: IconTarget, text: "AI scoring out of 10 per answer" },
            { icon: IconChat, text: "Written feedback for every answer" },
            { icon: IconAlert, text: "Full session report on completion" },
          ].map(({ icon: ItemIcon, text }) => (
            <li
              key={text}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-muted px-3 py-2.5 text-xs font-medium text-ink-soft"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/12">
                <ItemIcon size={13} />
              </span>
              {text}
            </li>
          ))}
        </ul>

        {/* Read-only Active Resume Display Card */}
        <div className="rounded-2xl border border-line bg-surface-muted/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Active Resume
            </span>
            {isReady && (
              <Badge tone="success">
                <IconCheck size={12} className="mr-0.5" /> Ready for interview
              </Badge>
            )}
            {isPending && (
              <Badge tone="warning">
                <Spinner className="mr-0.5 h-3 w-3" /> Indexing in progress
              </Badge>
            )}
            {isFailed && (
              <Badge tone="danger">
                <IconAlert size={12} className="mr-0.5" /> Indexing failed
              </Badge>
            )}
          </div>

          <div className="mt-3 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              <IconResume size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {activeResume.fileName}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                Uploaded {activeResume.uploadedAt ? formatDate(activeResume.uploadedAt) : "Recently"} • Active Resume #{activeResume.id}
              </p>
            </div>
          </div>

          {isPending && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Your resume is currently being indexed into the vector store. Question generation requires vector search.
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="shrink-0"
                >
                  {isRefreshing ? <Spinner /> : <IconRefresh size={13} />}
                  {isRefreshing ? "Checking…" : "Check status"}
                </Button>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Vector indexing failed for your active resume. Interview questions cannot be generated until indexing succeeds.
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="shrink-0"
                >
                  {isRetrying ? <Spinner /> : <IconRefresh size={13} />}
                  {isRetrying ? "Retrying indexing…" : "Retry indexing"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/resume"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300"
          >
            {isFailed ? "Retry indexing on resume page" : "Upload or replace active resume"}
          </Link>

          <Button
            size="lg"
            onClick={onStart}
            disabled={!isReady || isStarting}
          >
            {isStarting ? <Spinner /> : <IconMic size={16} />}
            {isStarting
              ? "Generating questions…"
              : isPending
                ? "Indexing in progress…"
                : isFailed
                  ? "Indexing failed"
                  : "Start mock interview"}
          </Button>
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------- Question ------------------------------- */

function QuestionWorkspace({
  questions,
  activeIndex,
  onSelect,
  answerDraft,
  onAnswerChange,
  onSubmit,
  isSubmitting,
  evaluation,
  sessionStatus,
  answeredCount,
  totalCount,
}) {
  const textareaRef = useRef(null)
  const current = questions[activeIndex]
  const progress = totalCount ? Math.round((answeredCount / totalCount) * 100) : 0
  const isLocked = sessionStatus === "COMPLETED"

  const tone = difficultyTone(current?.difficulty)

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-ink">
              {answeredCount} of {totalCount} answered
            </span>
            <Badge tone={isLocked ? "success" : "info"}>
              <span
                className={cx(
                  "h-1.5 w-1.5 rounded-full",
                  isLocked ? "bg-emerald-500" : "bg-sky-500",
                )}
              />
              {isLocked ? "Completed" : "In progress"}
            </Badge>
          </div>
          <span className="text-xs font-bold tabular-nums text-brand-600 dark:text-brand-300">
            {progress}%
          </span>
        </div>

        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Interview progress"
        >
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="mt-4 flex flex-wrap gap-2">
          {questions.map((question, index) => {
            const isCurrent = index === activeIndex
            return (
              <li key={question.id || index}>
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  disabled={isSubmitting}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cx(
                    "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                    isCurrent
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-300"
                      : question.answered
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "border-line bg-surface text-ink-muted hover:border-brand-300 hover:text-brand-600",
                  )}
                >
                  <span>Q{question.questionNumber || index + 1}</span>
                  {question.answered && question.score != null && (
                    <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] tabular-nums dark:bg-white/10">
                      {question.score}/10
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      </Card>

      {/* Question */}
      {current && (
        <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">
                Question {current.questionNumber || activeIndex + 1} of {totalCount}
              </Badge>
              {current.category && (
                <Badge tone="neutral">{current.category}</Badge>
              )}
            </div>
            {current.difficulty && (
              <span
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold",
                  tone.chip,
                )}
              >
                <span className={cx("h-1.5 w-1.5 rounded-full", tone.dot)} />
                {current.difficulty}
              </span>
            )}
          </div>

          <h2 className="mt-5 text-base font-medium leading-relaxed text-ink sm:text-lg">
            {current.question}
          </h2>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="candidate-answer"
                className="text-xs font-semibold text-ink-soft"
              >
                Your technical answer
              </label>
              <span
                className={cx(
                  "text-[11px] tabular-nums",
                  answerDraft.length > 4000 ? "text-amber-600" : "text-ink-faint",
                )}
              >
                {answerDraft.length} characters
              </span>
            </div>

            <textarea
              ref={textareaRef}
              id="candidate-answer"
              rows={9}
              value={answerDraft}
              onChange={(event) => onAnswerChange(event.target.value)}
              disabled={isSubmitting || isLocked}
              placeholder="Walk through your approach, the trade-offs you considered, and any concrete examples from your projects…"
              className="w-full rounded-xl border border-line bg-surface-muted p-4 text-sm leading-relaxed text-ink transition placeholder:text-ink-faint focus:border-brand-400 focus:bg-surface focus:ring-4 focus:ring-brand-500/12 focus:outline-none disabled:opacity-60"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onSelect(activeIndex - 1)}
                  disabled={activeIndex === 0 || isSubmitting}
                  icon={<IconArrowLeft size={13} />}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onSelect(activeIndex + 1)}
                  disabled={activeIndex >= questions.length - 1 || isSubmitting}
                >
                  Next
                  <IconArrowRight size={13} />
                </Button>
              </div>

              {!isLocked && (
                <Button
                  type="submit"
                  disabled={isSubmitting || !answerDraft.trim()}
                >
                  {isSubmitting ? <Spinner /> : <IconCheck size={15} />}
                  {isSubmitting
                    ? "Evaluating with AI…"
                    : current.answered
                      ? "Update answer"
                      : "Submit answer"}
                </Button>
              )}
            </div>
          </form>

          {(current.answered || evaluation) && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-500/25 dark:bg-emerald-500/8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  AI interviewer evaluation
                </p>
                <span className="rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-bold tabular-nums text-white">
                  {evaluation?.score ?? current.score} / 10
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {evaluation?.feedback ?? current.aiFeedback}
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

/* ------------------------------- Results -------------------------------- */

function ResultView({ session, result, questions }) {
  const answered = questions.filter((q) => q.answered)

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge tone="success">Interview completed</Badge>
          <h2 className="mt-3 text-xl font-bold text-ink">Final results</h2>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-ink-muted">
            All {questions.length} questions were graded by the AI interviewer.
            Session #{session?.id} started{" "}
            {formatDate(session?.startedAt)}.
          </p>
        </div>

        {result && (
          <div className="flex items-center gap-6">
            <ScoreRing
              value={Number(result.averageScore) || 0}
              max={10}
              size={124}
              stroke={11}
              color={EMERALD}
              primary={`${Number(result.averageScore || 0).toFixed(1)}`}
              secondary="avg / 10"
              caption={`Average score out of 10 across ${result.answeredQuestions} answers`}
            />
            <div className="space-y-2.5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                  Total points
                </p>
                <p className="text-xl font-bold tabular-nums text-ink">
                  {result.totalScore}
                  <span className="text-xs font-medium text-ink-faint">
                    {" "}
                    / {result.totalQuestions * 10}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                  Answered
                </p>
                <p className="text-sm font-bold tabular-nums text-ink">
                  {result.answeredQuestions} / {result.totalQuestions}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {answered.length > 0 && (
        <div className="mt-7 border-t border-line pt-6">
          <h3 className="text-sm font-semibold text-ink">Question breakdown</h3>
          <ul className="mt-4 space-y-2.5">
            {answered.map((question, index) => (
              <li
                key={question.id || index}
                className="rounded-xl border border-line bg-surface-muted p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 text-xs font-medium leading-relaxed text-ink">
                    <span className="mr-2 font-bold text-ink-faint">
                      Q{question.questionNumber || index + 1}
                    </span>
                    {question.question}
                  </p>
                  <span
                    className={cx(
                      "shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums",
                      Number(question.score) >= 7
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300"
                        : Number(question.score) >= 4
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-300"
                          : "bg-red-50 text-red-600 dark:bg-red-500/12 dark:text-red-300",
                    )}
                  >
                    {question.score}/10
                  </span>
                </div>
                {question.aiFeedback && (
                  <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">
                    {question.aiFeedback}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function ReportView({ report, onGenerate, isGenerating, onRetry }) {
  if (!report) {
    return (
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Detailed AI interview report
            </h2>
            <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-ink-muted">
              Ask the AI to summarise your performance, list your strongest areas
              and produce a targeted action plan. Generation can take up to a
              minute.
            </p>
          </div>
          <Button onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? <Spinner /> : <IconBolt size={16} />}
            {isGenerating ? "Generating report…" : "Generate AI report"}
          </Button>
        </div>

        {isGenerating && (
          <div className="mt-5 space-y-2.5" aria-hidden="true">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="animate-pulse-soft h-16 rounded-xl bg-line"
                style={{ animationDelay: `${row * 120}ms` }}
              />
            ))}
          </div>
        )}

        {onRetry && (
          <div className="mt-5">
            <Button variant="secondary" size="sm" onClick={onRetry}>
              <IconRefresh size={14} />
              Try generating again
            </Button>
          </div>
        )}
      </Card>
    )
  }

  const sections = [
    { key: "strengths", title: "Key strengths", tone: "success", marker: IconCheck },
    { key: "weaknesses", title: "Key weaknesses", tone: "warning", marker: IconAlert },
    { key: "improvements", title: "Action plan", tone: "info", marker: IconBolt },
  ]

  const TONE_CARD = {
    success: "border-emerald-100 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/6",
    warning: "border-amber-100 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/6",
    info: "border-sky-100 bg-sky-50/50 dark:border-sky-500/20 dark:bg-sky-500/6",
  }
  const TONE_TEXT = {
    success: "text-emerald-700 dark:text-emerald-400",
    warning: "text-amber-700 dark:text-amber-400",
    info: "text-sky-700 dark:text-sky-400",
  }

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Detailed AI report</h2>
        <span className="text-[11px] text-ink-faint">
          Session #{report.sessionId} · {report.answeredQuestions}/
          {report.totalQuestions} answered
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-line bg-surface-muted p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
          Overall performance
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {report.overallPerformance || "The AI did not return a summary."}
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {sections.map((section) => {
          const items = Array.isArray(report[section.key]) ? report[section.key] : []
          const SectionIcon = section.marker
          return (
            <div
              key={section.key}
              className={cx("rounded-xl border p-5", TONE_CARD[section.tone])}
            >
              <h3
                className={cx(
                  "flex items-center gap-2 text-sm font-semibold",
                  TONE_TEXT[section.tone],
                )}
              >
                <SectionIcon size={15} />
                {section.title}
              </h3>
              {items.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {items.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-xs leading-relaxed text-ink-soft"
                    >
                      <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs italic text-ink-faint">
                  Nothing reported in this section.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* --------------------------------- Page ---------------------------------- */

function Interview() {
  const [searchParams, setSearchParams] = useSearchParams()
  const querySessionId = searchParams.get("sessionId")
  const viewTab = searchParams.get("tab")

  const [activeResume, setActiveResume] = useState(null)
  const [selectedResumeId, setSelectedResumeId] = useState(null)
  const [isLoadingSetup, setIsLoadingSetup] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [session, setSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [answerDraft, setAnswerDraft] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [latestEvaluation, setLatestEvaluation] = useState(null)

  const [result, setResult] = useState(null)
  const [report, setReport] = useState(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState("")
  const [error, setError] = useState("")
  const startedRef = useRef(false)

  const loadExistingSession = useCallback(async (sessionId, openReport = false) => {
    setError("")
    setIsLoadingSetup(true)
    try {
      const [sessionData, questionList] = await Promise.all([
        getInterviewSession(sessionId),
        getInterviewQuestions(sessionId),
      ])

      setSession(sessionData)
      setQuestions(questionList || [])
      setSavedSessionId(sessionId)

      const list = questionList || []
      const firstUnanswered = list.findIndex((q) => !q.answered)
      const target = firstUnanswered !== -1 ? firstUnanswered : Math.max(0, list.length - 1)
      setActiveIndex(target)
      setAnswerDraft(list[target]?.candidateAnswer || "")
      setLatestEvaluation(
        list[target]?.answered
          ? { score: list[target].score, feedback: list[target].aiFeedback }
          : null,
      )

      const allAnswered = list.length > 0 && list.every((q) => q.answered)
      if (sessionData.status === "COMPLETED" || allAnswered) {
        setResult(await getInterviewResult(sessionId))
        if (openReport) {
          setIsGeneratingReport(true)
          try {
            setReport(await getInterviewReport(sessionId))
            setReportError("")
          } catch (reportErr) {
            setReportError(
              reportErr?.response?.data?.message ||
                "The AI report could not be generated right now.",
            )
          } finally {
            setIsGeneratingReport(false)
          }
        }
      }
    } catch (err) {
      setSavedSessionId(null)
      setError(
        err?.response?.data?.message ||
          "Could not load the requested interview session.",
      )
    } finally {
      setIsLoadingSetup(false)
      setIsGeneratingReport(false)
    }
  }, [])

  useEffect(() => {
    if (startedRef.current) {
      startedRef.current = false
      return
    }

    let active = true
    const init = async () => {
      setIsLoadingSetup(true)
      try {
        const currentResume = await getCurrentResume().catch(() => null)
        if (!active) return
        if (currentResume && currentResume.id && currentResume.active) {
          setActiveResume(currentResume)
          setSelectedResumeId(currentResume.id)
          saveResumeMeta({ resumeId: currentResume.id, name: currentResume.fileName })
        } else {
          setActiveResume(null)
          setSelectedResumeId(null)
        }

        const targetSessionId = querySessionId
          ? Number(querySessionId)
          : getSavedSessionId()

        if (targetSessionId) {
          await loadExistingSession(targetSessionId, viewTab === "report")
        }
      } finally {
        if (active) setIsLoadingSetup(false)
      }
    }

    init()
    return () => {
      active = false
    }
  }, [querySessionId, viewTab, loadExistingSession])

  const handleRefreshActiveResume = async () => {
    setIsRefreshing(true)
    try {
      const refreshed = await getCurrentResume().catch(() => null)
      if (refreshed && refreshed.id && refreshed.active) {
        setActiveResume(refreshed)
        setSelectedResumeId(refreshed.id)
      } else {
        setActiveResume(null)
        setSelectedResumeId(null)
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRetryIndexing = async () => {
    if (!activeResume?.id || isRetrying) return
    setIsRetrying(true)
    setError("")
    try {
      await retryResume(activeResume.id)
      const refreshed = await getCurrentResume()
      if (refreshed && refreshed.id && refreshed.active) {
        setActiveResume(refreshed)
        setSelectedResumeId(refreshed.id)
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to re-index resume. Please try again or re-upload your resume on the resume page."
      )
    } finally {
      setIsRetrying(false)
    }
  }

  const handleStartInterview = async () => {
    if (!selectedResumeId || isStarting) return

    setError("")
    setIsStarting(true)
    setResult(null)
    setReport(null)
    setReportError("")
    setLatestEvaluation(null)

    try {
      const createdSession = await startInterview(selectedResumeId)
      const questionList = await getInterviewQuestions(createdSession.id)

      setSession(createdSession)
      setQuestions(questionList || [])
      setActiveIndex(0)
      setAnswerDraft("")
      setSavedSessionId(createdSession.id)
      startedRef.current = true
      setSearchParams({ sessionId: String(createdSession.id) })
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not start the mock interview. Make sure a resume is uploaded and the AI service is reachable.",
      )
    } finally {
      setIsStarting(false)
    }
  }

  const handleSelectQuestion = (index) => {
    if (isSubmitting || index < 0 || index >= questions.length) return

    const target = questions[index]
    const hasUnsavedDraft =
      answerDraft.trim().length > 40 &&
      !questions[activeIndex]?.answered &&
      answerDraft !== (questions[activeIndex]?.candidateAnswer || "")

    if (hasUnsavedDraft) {
      const confirmed = window.confirm(
        "You have an unsaved answer draft. Switch questions anyway?",
      )
      if (!confirmed) return
    }

    setActiveIndex(index)
    setAnswerDraft(target?.candidateAnswer || "")
    setLatestEvaluation(
      target?.answered ? { score: target.score, feedback: target.aiFeedback } : null,
    )
    setError("")
  }

  const handleSubmitAnswer = async (event) => {
    event.preventDefault()
    const currentQuestion = questions[activeIndex]
    if (!currentQuestion || isSubmitting) return

    const trimmed = answerDraft.trim()
    if (!trimmed) {
      setError("Write an answer before submitting.")
      return
    }

    setError("")
    setIsSubmitting(true)

    try {
      const evaluation = await submitInterviewAnswer(currentQuestion.id, trimmed)
      setLatestEvaluation(evaluation)

      const updated = questions.map((question, index) =>
        index === activeIndex
          ? {
              ...question,
              candidateAnswer: trimmed,
              score: evaluation.score,
              aiFeedback: evaluation.feedback,
              answered: true,
            }
          : question,
      )
      setQuestions(updated)

      if (updated.every((question) => question.answered)) {
        setSession((previous) =>
          previous ? { ...previous, status: "COMPLETED" } : previous,
        )
        setResult(await getInterviewResult(session.id))
      } else {
        const nextIdx = updated.findIndex(
          (question, index) => index > activeIndex && !question.answered,
        )
        if (nextIdx !== -1) {
          setActiveIndex(nextIdx)
          setAnswerDraft("")
          setLatestEvaluation(null)
        }
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not evaluate your answer. Your draft is preserved — try submitting again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!session?.id || isGeneratingReport) return
    setError("")
    setReportError("")
    setIsGeneratingReport(true)
    try {
      setReport(await getInterviewReport(session.id))
    } catch (err) {
      setReportError(
        err?.response?.data?.message ||
          err?.message ||
          "The AI report could not be generated. Please try again.",
      )
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleStartNewSession = () => {
    setSavedSessionId(null)
    setSession(null)
    setQuestions([])
    setResult(null)
    setReport(null)
    setReportError("")
    setLatestEvaluation(null)
    setAnswerDraft("")
    setSearchParams({})
  }

  const answeredCount = questions.filter((q) => q.answered).length
  const totalCount = questions.length || session?.totalQuestions || 0
  const isCompleted =
    session?.status === "COMPLETED" ||
    (totalCount > 0 && answeredCount === totalCount)

  if (isLoadingSetup) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3">
        <Spinner className="h-7 w-7 text-brand-500" />
        <p className="text-sm text-ink-muted">Loading interview workspace…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Mock interview"
        title={session ? `Session #${session.id}` : "Personalized AI interview"}
        description={
          session
            ? isCompleted
              ? "This interview is graded. Review your answers or generate the full AI report."
              : "Answer each question in your own words to receive an instant score and written feedback."
            : "InterviewForge generates five personalized questions grounded in your active resume."
        }
        actions={
          session && (
            <Button variant="secondary" onClick={handleStartNewSession}>
              <IconMic size={15} />
              Start new interview
            </Button>
          )
        }
      />

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300"
        >
          <span className="flex items-start gap-2.5">
            <IconAlert size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </span>
          <button
            type="button"
            onClick={() => setError("")}
            className="shrink-0 text-xs font-bold underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {!session ? (
        <SetupView
          activeResume={activeResume}
          onStart={handleStartInterview}
          isStarting={isStarting}
          onRetry={handleRetryIndexing}
          isRetrying={isRetrying}
          onRefresh={handleRefreshActiveResume}
          isRefreshing={isRefreshing}
        />
      ) : questions.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={<IconAlert size={24} />}
            title="No questions were generated for this session"
            description="The question generator returned an empty set. Re-analyze your resume or start a new interview to try again."
            action={
              <Button onClick={handleStartNewSession}>
                <IconRefresh size={15} />
                Start a new interview
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          <QuestionWorkspace
            questions={questions}
            activeIndex={activeIndex}
            onSelect={handleSelectQuestion}
            answerDraft={answerDraft}
            onAnswerChange={setAnswerDraft}
            onSubmit={handleSubmitAnswer}
            isSubmitting={isSubmitting}
            evaluation={latestEvaluation}
            sessionStatus={isCompleted ? "COMPLETED" : session.status}
            answeredCount={answeredCount}
            totalCount={totalCount}
          />

          {isCompleted && (
            <>
              <ResultView session={session} result={result} questions={questions} />

              {reportError && (
                <ErrorState message={reportError} onRetry={handleGenerateReport} />
              )}

              <ReportView
                report={report}
                onGenerate={handleGenerateReport}
                isGenerating={isGeneratingReport}
                onRetry={reportError ? handleGenerateReport : null}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Interview