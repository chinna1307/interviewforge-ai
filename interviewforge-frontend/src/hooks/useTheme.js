import { useCallback, useEffect, useState } from "react"

import { applyTheme, getTheme, subscribeToTheme, toggleTheme } from "../lib/theme"

/** Theme state shared by the topbar toggle and the profile appearance card. */
export default function useTheme() {
  const [theme, setTheme] = useState(getTheme)

  useEffect(() => subscribeToTheme(() => setTheme(getTheme())), [])

  const set = useCallback((next) => setTheme(applyTheme(next)), [])
  const toggle = useCallback(() => setTheme(toggleTheme()), [])

  return { theme, set, toggle }
}