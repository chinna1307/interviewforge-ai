import { useCallback, useState } from "react"
import { Outlet } from "react-router-dom"

import Sidebar from "../components/Sidebar"
import TopBar from "../components/TopBar"
import { useWorkspace } from "../context/workspace"
import { WorkspaceProvider } from "../context/WorkspaceProvider"

function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMobileMenuOpen(false), [])

  return (
    <WorkspaceProvider>
      <AppShell
        mobileMenuOpen={mobileMenuOpen}
        onOpenMenu={() => setMobileMenuOpen(true)}
        onCloseMenu={closeMenu}
      />
    </WorkspaceProvider>
  )
}

function AppShell({ mobileMenuOpen, onOpenMenu, onCloseMenu }) {
  const { user, streak, inProgressSessions, isLoading } = useWorkspace()

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={onCloseMenu}
        user={user}
        streak={streak}
      />

      <div className="lg:pl-[264px]">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <TopBar
            onOpenMenu={onOpenMenu}
            isMenuOpen={mobileMenuOpen}
            user={user}
            streak={streak}
            notificationCount={isLoading ? 0 : inProgressSessions}
          />

          <main id="main-content" className="animate-rise">
            <Outlet />
          </main>

          <footer className="mt-12 border-t border-line pt-5 text-[11px] text-ink-faint">
            InterviewForge AI · Every figure on this dashboard is computed from
            your own interview sessions.
          </footer>
        </div>
      </div>
    </div>
  )
}

export default DashboardLayout