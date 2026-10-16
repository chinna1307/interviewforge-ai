import { createContext, useContext } from "react"

/**
 * Shared authenticated workspace data. Loaded once by WorkspaceProvider so the
 * shell, dashboard and history pages never issue duplicate requests.
 */
const WorkspaceContext = createContext(null)

export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) {
    throw new Error("useWorkspace must be used inside <WorkspaceProvider>")
  }
  return value
}

export default WorkspaceContext