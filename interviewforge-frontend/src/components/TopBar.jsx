import { useEffect, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"

import { clearAuthToken } from "../services/authService"
import useTheme from "../hooks/useTheme"
import { IconBell, IconFlame, IconMenu, IconMoon, IconSun, IconLogout, IconUser } from "./Icons"
import { cx } from "../lib/cx"

const ROUTE_META = {
  "/dashboard": { title: "Dashboard", context: "Your preparation at a glance" },
  "/resume": { title: "Resume Review", context: "AI resume analysis" },
  "/interview": { title: "Mock Interview", context: "Live practice session" },
  "/history": { title: "Interview History", context: "Every session you've run" },
  "/profile": { title: "Profile & Settings", context: "Account and preferences" },
}

function TopBar({ onOpenMenu, isMenuOpen, user, streak, notificationCount = 0 }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const meta = ROUTE_META[location.pathname] ?? {
    title: "InterviewForge AI",
    context: "",
  }

  const displayName = user?.name || user?.email?.split("@")[0] || "Candidate"
  const initials = displayName.trim().charAt(0).toUpperCase()

  useEffect(() => {
    if (!menuOpen) return undefined

    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false)
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-30 -mx-4 mb-6 border-b border-line bg-canvas/85 px-4 py-3.5 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft transition hover:border-brand-300 hover:text-brand-600 lg:hidden"
          aria-label="Open navigation menu"
          aria-controls="app-sidebar"
          aria-expanded={isMenuOpen}
        >
          <IconMenu size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold text-ink">{meta.title}</h1>
          {meta.context && (
            <p className="truncate text-xs text-ink-muted">{meta.context}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span className="hidden items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 sm:inline-flex dark:border-orange-500/25 dark:bg-orange-500/12 dark:text-orange-300">
              <IconFlame size={14} />
              {streak} day streak
            </span>
          )}

          <button
            type="button"
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
          </button>

          {notificationCount > 0 && (
            <button
              type="button"
              className="relative hidden h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition hover:border-brand-300 hover:text-brand-600 sm:flex"
              aria-label={`${notificationCount} sessions need attention`}
            >
              <IconBell size={16} />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            </button>
          )}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2 transition hover:border-brand-300"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-300 text-[11px] font-bold text-white">
                {initials}
              </span>
              <span className="hidden max-w-24 truncate text-xs font-semibold text-ink sm:block">
                {displayName}
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_40px_-12px_rgba(15,23,42,0.25)]"
              >
                <div className="border-b border-line px-4 py-3">
                  <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
                  <p className="truncate text-[11px] text-ink-muted">{user?.email || "—"}</p>
                  <span className="mt-2 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    {user?.role || "CANDIDATE"}
                  </span>
                </div>

                <Link
                  to="/profile"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className={cx(
                    "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft transition hover:bg-canvas hover:text-brand-600",
                  )}
                >
                  <IconUser size={16} />
                  Profile & settings
                </Link>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    clearAuthToken()
                    navigate("/login", { replace: true })
                  }}
                  className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <IconLogout size={16} />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopBar