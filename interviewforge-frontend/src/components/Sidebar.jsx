import { useEffect, useRef } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"

import { clearAuthToken } from "../services/authService"
import {
  IconClose,
  IconLogout,
  IconMic,
  IconResume,
  IconHistory,
  IconDashboard,
  IconUser,
  IconFlame,
  IconInfo,
} from "./Icons"
import { cx } from "../lib/cx"

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: IconDashboard, end: true },
      { to: "/resume", label: "Resume Review", icon: IconResume },
      { to: "/interview", label: "Mock Interview", icon: IconMic },
      { to: "/history", label: "History", icon: IconHistory },
    ],
  },
  {
    label: "Account",
    items: [{ to: "/profile", label: "Profile & Settings", icon: IconUser }],
  },
  {
    label: "About",
    items: [{ to: "/about", label: "About", icon: IconInfo }],
  },
]

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/images/interviewforge-icon.png"
        alt="InterviewForge AI"
        className="h-10 w-10 shrink-0 rounded-xl object-contain shadow-[0_8px_18px_-6px_rgba(108,92,231,0.9)]"
      />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-bold leading-tight text-white">
          InterviewForge
          <span className="text-brand-300"> AI</span>
        </p>
        <p className="truncate text-[11px] font-medium text-white/45">
          Practice · Improve · Get hired
        </p>
      </div>
    </div>
  )
}

function Sidebar({ isOpen, onClose, user, streak }) {
  const navigate = useNavigate()
  const location = useLocation()
  const closeButtonRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    if (!isOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("keydown", onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeButtonRef.current?.focus()

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, onClose])

  const handleLogout = () => {
    clearAuthToken()
    onClose()
    navigate("/login", { replace: true })
  }

  const displayName = user?.name || user?.email?.split("@")[0] || "Candidate"
  const initials = displayName.trim().charAt(0).toUpperCase()

  return (
    <>
      <div
        className={cx(
          "fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-200 lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        id="app-sidebar"
        aria-label="Primary navigation"
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col justify-between border-r border-white/8 bg-shell-900 transition-transform duration-200 ease-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-5">
          <BrandMark />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation menu"
          >
            <IconClose size={18} />
          </button>
        </div>

        <nav className="scrollbar-none flex-1 overflow-y-auto px-4 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-6">
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const ItemIcon = item.icon
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          cx(
                            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                            isActive
                              ? "bg-gradient-to-r from-[#6C5CE7] to-[#7C4DFF] text-white shadow-[0_10px_20px_-10px_rgba(108,92,231,0.9)]"
                              : "text-white/60 hover:bg-white/6 hover:text-white",
                          )
                        }
                      >
                        <ItemIcon size={18} />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-3 px-4 pb-5">
          <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-brand-500/22 to-brand-500/5 p-4">
            <span
              className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-brand-400/25 blur-2xl"
              aria-hidden="true"
            />
            <p className="text-[13px] font-semibold leading-snug text-white">
              Stay consistent. Get hired.
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">
              Small steps today, big results tomorrow.
            </p>

            {streak > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white">
                <IconFlame size={13} className="text-orange-400" />
                {streak} day streak
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-300 text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white">{displayName}</p>
                <p className="truncate text-[10px] font-medium text-white/45">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-white/45 transition hover:bg-red-500/20 hover:text-red-300"
                aria-label="Log out of InterviewForge AI"
                title="Log out"
              >
                <IconLogout size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar