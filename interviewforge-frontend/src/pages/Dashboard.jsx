import { useNavigate } from "react-router-dom"

import { useWorkspace } from "../context/workspace"
import {
  Badge,
  Card,
  CardTitle,
  EmptyState,
  ErrorState,
  Skeleton,
  StatPill,
  StatusBadge,
} from "../components/ui"
import { cx } from "../lib/cx"
import {
  BRAND,
  EMERALD,
  RadarChart,
  ScoreRing,
  Sparkline,
  WeeklyBars,
} from "../components/charts"
import {
  IconAlert,
  IconArrowRight,
  IconBolt,
  IconChart,
  IconCheck,
  IconHistory,
  IconMic,
  IconResume,
  IconTarget,
} from "../components/Icons"
import { formatDate } from "../lib/metrics"

const CATEGORY_COLORS = ["#6C5CE7", "#10B981", "#0EA5E9", "#FF6B4A", "#F59E0B"]

function greetingFor(hour) {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

/* ------------------------------ Row 1 left ----------------------------- */

function ProgressCard({ stats, scoreSeries, answeredSeries }) {
  const { totalSessions, questionsSolved, avgScore, completionRate, hasScores } = stats

  const headline = hasScores ? avgScore * 10 : completionRate

  return (
    <Card className="flex flex-col gap-7 bg-surface-tint p-6 sm:flex-row sm:items-center sm:p-7">
      <ScoreRing
        value={headline}
        max={100}
        size={158}
        stroke={13}
        color={BRAND}
        primary={`${Math.round(headline)}%`}
        secondary={hasScores ? "avg. score" : "answered"}
        caption={
          hasScores
            ? `Average score ${avgScore.toFixed(2)} out of 10 across completed interviews`
            : `${questionsSolved} of ${stats.questionsOffered} questions answered`
        }
      />

      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Overall progress</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {totalSessions === 0
              ? "Complete your first mock interview to unlock measured progress."
              : hasScores
                ? `Measured from ${stats.completedSessions} completed interview${
                    stats.completedSessions === 1 ? "" : "s"
                  }. Score is out of 10, shown here as a percentage.`
                : `Based on ${questionsSolved} answered question${
                    questionsSolved === 1 ? "" : "s"
                  } so far. Scores appear once an interview is completed.`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Metric
            label="Mock interviews"
            value={totalSessions}
            series={answeredSeries}
            color={BRAND}
          />
          <Metric
            label="Questions solved"
            value={questionsSolved}
            series={answeredSeries}
            color={EMERALD}
          />
          <Metric
            label="Avg. score"
            value={hasScores ? `${(avgScore * 10).toFixed(0)}%` : "—"}
            series={scoreSeries}
            color="#0EA5E9"
          />
        </div>
      </div>
    </Card>
  )
}

function Metric({ label, value, series = [], color }) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/70 p-3 dark:border-white/8 dark:bg-white/4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
          {label}
        </p>
        <Sparkline
          values={series}
          color={color}
          width={54}
          height={20}
          label={label}
        />
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums text-ink">{value}</p>
    </div>
  )
}

/* ------------------------------ Row 1 right ---------------------------- */

function SkillsCard({ categoryScores, isLoading }) {
  const top = categoryScores.slice(0, 5)

  return (
    <Card className="flex flex-col p-6">
      <CardTitle
        subtitle={
          categoryScores.length > 0
            ? "Average AI score per question category, straight from your evaluations."
            : "Category scores appear once you have graded answers."
        }
        action={
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/12">
            <IconTarget size={17} />
          </div>
        }
      >
        Skills overview
      </CardTitle>

      {isLoading && categoryScores.length === 0 ? (
        <div className="mt-5 flex flex-1 items-center justify-center">
          <Skeleton className="h-52 w-52 rounded-full" />
        </div>
      ) : top.length < 3 ? (
        <EmptyState
          icon={<IconTarget size={24} />}
          title="Not enough graded answers yet"
          description="InterviewForge tags every generated question with a category and difficulty. After you answer questions in at least three different categories, your real skill breakdown is charted here."
          className="flex-1 py-8"
        />
      ) : (
        <div className="mt-4 flex flex-1 flex-col items-center gap-4 lg:flex-row lg:items-center">
          <div className="w-full max-w-[260px] shrink-0">
            <RadarChart axes={top} max={10} color={BRAND} />
          </div>

          <ul className="w-full flex-1 space-y-2.5">
            {top.map((item, index) => (
              <li key={item.label} className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-soft">
                  {item.label}
                </span>
                <span className="text-xs font-bold tabular-nums text-ink">
                  {item.value.toFixed(1)}
                </span>
                <span className="text-[10px] text-ink-faint">/10</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

/* -------------------------------- Row 2 -------------------------------- */

const NEXT_UP = [
  {
    key: "interview",
    eyebrow: "Mock interview",
    title: "Practice with a fresh question set",
    description:
      "Generates new technical, project, backend and problem-solving questions from your resume.",
    badge: "5 AI questions",
    tone: "emerald",
    icon: IconMic,
    action: "Start now",
    path: "/interview",
  },
  {
    key: "resume",
    eyebrow: "Resume AI review",
    title: "Get your resume graded by AI",
    description:
      "Upload a PDF or DOCX and receive extracted skills, strengths, gaps and suggestions.",
    badge: "PDF · DOCX",
    tone: "indigo",
    icon: IconResume,
    action: "Analyze now",
    path: "/resume",
  },
  {
    key: "report",
    eyebrow: "Weakness drilldown",
    title: "Turn your last report into practice",
    description:
      "Read the strengths, weaknesses and action plan generated from your most recent completed interview.",
    badge: "AI report",
    tone: "coral",
    icon: IconAlert,
    action: "Review now",
    path: "/history",
  },
]

const TONE_STYLES = {
  emerald: {
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300",
    button: "bg-[#10B981] hover:bg-[#059669]",
    ring: "text-emerald-500",
  },
  indigo: {
    badge: "bg-brand-50 text-brand-600 dark:bg-brand-500/12 dark:text-brand-300",
    button: "bg-brand-500 hover:bg-brand-600",
    ring: "text-brand-500",
  },
  coral: {
    badge: "bg-orange-50 text-orange-600 dark:bg-orange-500/12 dark:text-orange-300",
    button: "bg-[#FF6B4A] hover:bg-[#E85A3A]",
    ring: "text-coral",
  },
}

function NextUpCards({ latestCompleted }) {
  const navigate = useNavigate()

  const reportTarget = latestCompleted
    ? `/interview?sessionId=${latestCompleted.sessionId}&tab=report`
    : "/history"

  const cards = NEXT_UP.map((card) =>
    card.key === "report" ? { ...card, path: reportTarget } : card,
  )

  return (
    <section aria-labelledby="next-up-heading">
      <h2 id="next-up-heading" className="text-[15px] font-semibold text-ink">
        Your next up
      </h2>

      <div className="mt-4 grid gap-5 md:grid-cols-3">
        {cards.map((card) => {
          const tone = TONE_STYLES[card.tone]
          const CardIcon = card.icon
          const target = card.path

          return (
            <Card
              key={card.key}
              className="flex flex-col p-6 transition-shadow duration-200 hover:shadow-card-hover"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cx(
                    "flex h-11 w-11 items-center justify-center rounded-xl",
                    tone.badge,
                  )}
                >
                  <CardIcon size={19} />
                </span>
                <Badge tone="neutral">{card.badge}</Badge>
              </div>

              <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                {card.eyebrow}
              </p>
              <h3 className="mt-1.5 text-[15px] font-semibold leading-snug text-ink">
                {card.title}
              </h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-muted">
                {card.description}
              </p>

              <button
                type="button"
                onClick={() => navigate(target)}
                className={cx(
                  "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors",
                  tone.button,
                )}
              >
                {card.action}
                <IconArrowRight size={15} />
              </button>
            </Card>
          )
        })}
      </div>

      {!latestCompleted && (
        <p className="mt-3 text-[11px] text-ink-faint">
          The weakness drilldown card links to your session history until your
          first completed interview produces an AI report.
        </p>
      )}
    </section>
  )
}

/* -------------------------------- Row 3 -------------------------------- */

function RecentInterviewCard({ latestCompleted, totalSessions }) {
  const navigate = useNavigate()

  if (!latestCompleted) {
    return (
      <Card className="flex flex-col p-6">
        <CardTitle subtitle="Your most recent graded interview session.">
          Recent mock interview
        </CardTitle>
        <EmptyState
          icon={<IconMic size={24} />}
          title="No completed interview yet"
          description="Finish a mock interview and it will appear here with your real score, answered count and status."
          className="flex-1 py-10"
          action={
            <button
              type="button"
              onClick={() => navigate("/interview")}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Start your first interview
              <IconArrowRight size={15} />
            </button>
          }
        />
      </Card>
    )
  }

  const score = Number(latestCompleted.averageScore) || 0
  const percent = Math.round(score * 10)
  const verdict =
    score >= 8
      ? "Excellent — interview ready"
      : score >= 6
        ? "Great job — keep pushing"
        : score >= 4
          ? "Solid base, focus on the gaps"
          : "Early days — consistency will move this"

  return (
    <Card className="flex flex-col p-6">
      <CardTitle
        subtitle={`Session #${latestCompleted.sessionId} · ${formatDate(latestCompleted.startedAt)}`}
        action={
          <button
            type="button"
            onClick={() => navigate("/history")}
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-300"
          >
            View all
            <IconArrowRight size={13} />
          </button>
        }
      >
        Recent mock interview
      </CardTitle>

      <div className="mt-5 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <ScoreRing
            value={percent}
            max={100}
            size={112}
            stroke={10}
            color={EMERALD}
            primary={`${percent}%`}
            secondary={`${score.toFixed(2)} / 10`}
            caption={`Score out of 10 for session ${latestCompleted.sessionId}`}
          />
          <div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {verdict}
            </p>
            <p className="mt-1 max-w-[190px] text-xs leading-relaxed text-ink-muted">
              Based on {latestCompleted.answeredQuestions} graded answer
              {latestCompleted.answeredQuestions === 1 ? "" : "s"} by the AI
              interviewer.
            </p>
          </div>
        </div>

        <div className="grid w-full flex-1 grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatPill label="Score" value={`${score.toFixed(1)}/10`} tone="success" />
          <StatPill
            label="Answered"
            value={`${latestCompleted.answeredQuestions}/${latestCompleted.totalQuestions}`}
          />
          <StatPill
            label="Resume"
            value={latestCompleted.resumeFileName || "—"}
          />
          <div className="rounded-xl border border-line bg-surface-muted px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              Status
            </p>
            <div className="mt-1">
              <StatusBadge status={latestCompleted.status} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
        <button
          type="button"
          onClick={() =>
            navigate(`/interview?sessionId=${latestCompleted.sessionId}&tab=report`)
          }
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
        >
          <IconChart size={14} />
          View AI report
        </button>
        <button
          type="button"
          onClick={() => navigate(`/interview?sessionId=${latestCompleted.sessionId}`)}
          className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
        >
          Review answers
        </button>
        <span className="ml-auto text-[11px] text-ink-faint">
          {totalSessions} session{totalSessions === 1 ? "" : "s"} total
        </span>
      </div>
    </Card>
  )
}

function WeeklyCard({ weekly, totalSessions }) {
  const totalThisWeek = weekly.reduce((sum, day) => sum + day.value, 0)

  return (
    <Card className="flex flex-col p-6">
      <CardTitle
        subtitle={
          totalSessions === 0
            ? "Interviews completed each day this week."
            : `${totalThisWeek} interview${totalThisWeek === 1 ? "" : "s"} started this week.`
        }
        action={
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/12">
            <IconBolt size={17} />
          </div>
        }
      >
        Weekly preparation
      </CardTitle>

      <div className="mt-5 flex-1">
        <WeeklyBars data={weekly} color={BRAND} />
      </div>

      {totalSessions === 0 && (
        <p className="mt-3 text-[11px] text-ink-faint">
          Days stay empty until you actually run an interview — nothing is
          estimated here.
        </p>
      )}
    </Card>
  )
}

/* ------------------------------- Onboarding ----------------------------- */

function OnboardingChecklist({ resumeCount, hasCompleted }) {
  const steps = [
    {
      label: "Upload a resume",
      done: resumeCount > 0,
      detail: resumeCount > 0 ? `${resumeCount} on file` : "Required to generate questions",
    },
    {
      label: "Run a mock interview",
      done: hasCompleted,
      detail: hasCompleted ? "Completed" : "5 personalized questions",
    },
    {
      label: "Read your AI report",
      done: false,
      detail: "Unlocks after a completed session",
    },
  ]

  return (
    <Card className="p-6">
      <CardTitle subtitle="Three steps between you and measurable progress.">
        Get started
      </CardTitle>
      <ul className="mt-5 space-y-3">
        {steps.map((step) => (
          <li key={step.label} className="flex items-start gap-3">
            <span
              className={cx(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                step.done
                  ? "bg-emerald-500 text-white"
                  : "border border-dashed border-line-strong text-ink-faint",
              )}
            >
              {step.done ? <IconCheck size={12} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-ink">{step.label}</span>
              <span className="block text-[11px] text-ink-muted">{step.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* ------------------------------- Page ---------------------------------- */

export default function Dashboard() {
  const navigate = useNavigate()
  const {
    user,
    resumes,
    sessions,
    stats,
    categoryScores,
    weekly,
    scoreSeries,
    streak,
    isLoading,
    error,
    refresh,
    latestCompleted,
    activeSession,
    displayName,
  } = useWorkspace()

  const resumeCount = resumes.length
  const resumeMeta = resumes[0]
  const hasCompleted = Boolean(latestCompleted)
  const isBrandNew = sessions.length === 0

  const answeredSeries = [...sessions]
    .sort((a, b) => new Date(a.startedAt || 0) - new Date(b.startedAt || 0))
    .map((s) => Number(s.answeredQuestions) || 0)

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
            {greetingFor(new Date().getHours())}, {displayName}
          </h2>
          <p className="mt-1.5 text-sm text-ink-muted">
            {isBrandNew
              ? "Let's get your preparation started — upload a resume and run your first mock interview."
              : `You've answered ${stats.questionsSolved} question${
                  stats.questionsSolved === 1 ? "" : "s"
                } across ${stats.totalSessions} session${stats.totalSessions === 1 ? "" : "s"}${
                  streak > 1 ? ` and are on a ${streak}-day streak` : ""
                }.`}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {activeSession && (
            <button
              type="button"
              onClick={() => navigate(`/interview?sessionId=${activeSession.sessionId}`)}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
            >
              <IconHistory size={16} />
              Resume session #{activeSession.sessionId}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate("/interview")}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-pill transition hover:bg-brand-600"
          >
            <IconMic size={16} />
            Start mock interview
          </button>
        </div>
      </header>

      {error && (
        <ErrorState
          message={error}
          onRetry={refresh}
        />
      )}

      {/* Row 1 — analytics */}
      <div className="grid gap-5 xl:grid-cols-2">
        {isLoading && sessions.length === 0 ? (
          <Card className="flex items-center gap-7 bg-surface-tint p-7">
            <Skeleton className="h-[158px] w-[158px] rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-4/5" />
              <div className="grid grid-cols-3 gap-3 pt-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            </div>
          </Card>
        ) : (
          <ProgressCard
            stats={stats}
            scoreSeries={scoreSeries}
            answeredSeries={answeredSeries}
          />
        )}

        <SkillsCard categoryScores={categoryScores} isLoading={isLoading} />
      </div>

      {/* Onboarding */}
      {isBrandNew && !isLoading && (
        <OnboardingChecklist resumeCount={resumeCount} hasCompleted={hasCompleted} />
      )}

      {/* Row 2 — actions */}
      <NextUpCards latestCompleted={latestCompleted} />

      {/* Row 3 — recent + weekly */}
      <div className="grid gap-5 xl:grid-cols-2">
        <RecentInterviewCard
          latestCompleted={latestCompleted}
          totalSessions={stats.totalSessions}
        />
        <WeeklyCard weekly={weekly} totalSessions={stats.totalSessions} />
      </div>

      {/* Resume context strip */}
      {resumeMeta && (
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/12">
              <IconResume size={19} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {resumeMeta.fileName}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                Resume #{resumeMeta.id}
                {resumeMeta.uploadedAt
                  ? ` · uploaded ${formatDate(resumeMeta.uploadedAt)}`
                  : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/resume")}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-600 sm:self-auto"
          >
            Review analysis
            <IconArrowRight size={14} />
          </button>
        </Card>
      )}

      {user?.email && (
        <p className="text-[11px] text-ink-faint">
          Signed in as {user.email}. Progress data is scoped to this account by
          the server.
        </p>
      )}
    </div>
  )
}