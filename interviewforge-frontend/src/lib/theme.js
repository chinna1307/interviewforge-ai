const THEME_KEY = "interviewforge_theme"
const EVENT_NAME = "interviewforge:themechange"

export const getTheme = () =>
  document.documentElement.classList.contains("dark") ? "dark" : "light"

export const applyTheme = (theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark")
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* private mode: preference simply will not persist */
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: theme }))
  return theme
}

export const toggleTheme = () => applyTheme(getTheme() === "dark" ? "light" : "dark")

export const subscribeToTheme = (listener) => {
  window.addEventListener(EVENT_NAME, listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener(EVENT_NAME, listener)
    window.removeEventListener("storage", listener)
  }
}