import useWorkspaceData from "../hooks/useWorkspaceData"
import WorkspaceContext from "./workspace"

export function WorkspaceProvider({ children }) {
  const workspace = useWorkspaceData()
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export default WorkspaceProvider