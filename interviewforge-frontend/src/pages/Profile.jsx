import { useNavigate } from "react-router-dom"

import { clearAuthToken } from "../services/authService"
import { useWorkspace } from "../context/workspace"
import useTheme from "../hooks/useTheme"
import {
  Badge,
  Button,
  Card,
  CardTitle,
  PageHeading,
} from "../components/ui"
import { cx } from "../lib/cx"
import {
  IconCheck,
  IconLogout,
  IconMic,
  IconMoon,
  IconResume,
  IconSun,
  IconUser,
} from "../components/Icons"
import { formatDate } from "../lib/metrics"

function PreferencesCard() {
  const { theme, set } = useTheme()

  const options = [
    { value: "light", label: "Light", icon: IconSun },
    { value: "dark", label: "Dark", icon: IconMoon },
  ]

  return (
    <Card className="p-6">
      <CardTitle subtitle="Saved on this device. Applies the next time you open the app.">
        Appearance
      </CardTitle>

      <div
        className="mt-5 grid grid-cols-2 gap-3"
        role="group"
        aria-label="Theme preference"
      >
        {options.map((option) => {
          const OptionIcon = option.icon
          const isActive = theme === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => set(option.value)}
              aria-pressed={isActive}
              className={cx(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition",
                isActive
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/12 dark:text-brand-300"
                  : "border-line bg-surface text-ink-muted hover:border-brand-300",
              )}
            >
              <OptionIcon size={17} />
              {option.label}
              {isActive && <IconCheck size={15} className="ml-auto" />}
            </button>
          )
        })}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
        This is the only preference stored locally. Profile and preparation data
        live on the server and are fetched with your authenticated session.
      </p>
    </Card>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, resumes, sessions, stats, isLoading } = useWorkspace()

  const displayName = user?.name || user?.email?.split("@")[0] || "Candidate"
  const initials = displayName.trim().charAt(0).toUpperCase()

  const handleLogout = () => {
    clearAuthToken()
    navigate("/login", { replace: true })
  }

  const accountFacts = [
    { label: "Full name", value: user?.name || "—" },
    { label: "Email address", value: user?.email || "—" },
    {
      label: "Member since",
      value: user?.createdAt ? formatDate(user.createdAt) : "Not reported by server",
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Account"
        title="Profile & settings"
        description="Your authenticated account details and preparation statistics, read directly from the InterviewForge API."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Identity */}
        <Card className="p-6 lg:col-span-1">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-300 text-xl font-bold text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-ink">
                {displayName}
              </h2>
              <p className="truncate text-[11px] text-ink-muted">{user?.email}</p>
              <Badge tone="brand" className="mt-2">
                {user?.role || "CANDIDATE"}
              </Badge>
            </div>
          </div>

          <dl className="mt-6 space-y-4 border-t border-line pt-5">
            {accountFacts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                  {fact.label}
                </dt>
                <dd className="mt-1 truncate text-sm font-medium text-ink">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 border-t border-line pt-5">
            <Button variant="danger" onClick={handleLogout}>
              <IconLogout size={15} />
              Sign out
            </Button>
          </div>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          {/* Statistics */}
          <Card className="p-6">
            <CardTitle subtitle="Counted from the resources stored on your account.">
              Workspace statistics
            </CardTitle>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatBlock
                label="Resumes"
                value={resumes.length}
                icon={IconResume}
                loading={isLoading}
              />
              <StatBlock
                label="Interviews"
                value={stats.totalSessions}
                icon={IconMic}
                loading={isLoading}
              />
              <StatBlock
                label="Questions solved"
                value={stats.questionsSolved}
                icon={IconUser}
                loading={isLoading}
              />
              <StatBlock
                label="Avg. score"
                value={stats.hasScores ? `${stats.avgScore.toFixed(1)}/10` : "—"}
                icon={IconUser}
                loading={isLoading}
              />
            </div>

            {sessions.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <Badge tone="info">
                  {stats.inProgressSessions} in progress
                </Badge>
                <Badge tone="success">
                  {stats.completedSessions} completed
                </Badge>
                <Badge tone="neutral">
                  {stats.completionRate}% of offered questions answered
                </Badge>
              </div>
            )}
          </Card>

          <PreferencesCard />
        </div>
      </div>

      <Card className="p-6">
        <CardTitle subtitle="Which server capabilities exist today.">
          Feature availability
        </CardTitle>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {[
            { label: "Display name and email", state: "server-owned, read only in the UI" },
            { label: "Profile editing", state: "no backend endpoint yet" },
            { label: "Password change", state: "no secure backend flow yet" },
            { label: "Notification preferences", state: "no backend endpoint yet" },
            { label: "Theme preference", state: "stored locally on this device" },
            { label: "Interview history", state: "server-owned, fully read-only here" },
          ].map((item) => (
            <li
              key={item.label}
              className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-muted px-4 py-3"
            >
              <span className="text-xs font-semibold text-ink">{item.label}</span>
              <span className="text-right text-[10px] text-ink-faint">{item.state}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function StatBlock({ label, value, icon: StatIcon, loading }) {
  return (
    <div className="rounded-xl border border-line bg-surface-muted px-4 py-3.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/12">
        <StatIcon size={15} />
      </span>
      <p className="mt-3 text-2xl font-bold tabular-nums text-ink">
        {loading ? "—" : value}
      </p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
        {label}
      </p>
    </div>
  )
}