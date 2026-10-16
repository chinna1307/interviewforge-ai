import { Link } from "react-router-dom"

import { IconCheck } from "./Icons"

const HIGHLIGHTS = [
  "Resume-grounded interview questions generated with RAG",
  "Instant per-answer scoring out of 10 with written feedback",
  "Strengths, weaknesses and a targeted action plan after every session",
  "Progress analytics built only from your own interview data",
]

export default function AuthLayout({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-shell-900 p-12 lg:flex lg:flex-col lg:justify-between">
        <span
          className="pointer-events-none absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-brand-500/25 blur-3xl"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-brand-300/15 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-300 text-white shadow-[0_10px_24px_-8px_rgba(108,92,231,0.9)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 17.5V7.2a1.2 1.2 0 0 1 1.86-1l5.4 3.9a1.2 1.2 0 0 0 1.48 0l5.4-3.9A1.2 1.2 0 0 1 20 7.2v10.3a1.2 1.2 0 0 1-1.87 1l-5.65-4.1a1.2 1.2 0 0 0-1.44 0L5.87 18.3A1.2 1.2 0 0 1 4 17.5Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-bold leading-tight text-white">
              InterviewForge<span className="text-brand-300"> AI</span>
            </p>
            <p className="text-[11px] font-medium text-white/45">
              Practice · Improve · Get hired
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight text-white text-balance">
            Practice real interviews.
            <br />
            Get scored honestly.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-white/70">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/25 text-brand-300">
                  <IconCheck size={11} strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-white/35">
          Your data stays on your own InterviewForge account.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-8 flex items-center gap-2.5 lg:hidden"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-300 text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 17.5V7.2a1.2 1.2 0 0 1 1.86-1l5.4 3.9a1.2 1.2 0 0 0 1.48 0l5.4-3.9A1.2 1.2 0 0 1 20 7.2v10.3a1.2 1.2 0 0 1-1.87 1l-5.65-4.1a1.2 1.2 0 0 0-1.44 0L5.87 18.3A1.2 1.2 0 0 1 4 17.5Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="text-sm font-bold text-ink">
              InterviewForge<span className="text-brand-500"> AI</span>
            </span>
          </Link>

          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-500">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-[28px] font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{subtitle}</p>

          <div className="mt-7">{children}</div>

          {footer && <div className="mt-6 text-sm text-ink-muted">{footer}</div>}
        </div>
      </main>
    </div>
  )
}