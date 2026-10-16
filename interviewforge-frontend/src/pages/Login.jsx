import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { loginUser, setAuthToken } from "../services/authService"
import AuthLayout from "../components/AuthLayout"
import { Button, Field, Spinner, inputClass } from "../components/ui"
import { cx } from "../lib/cx"
import { IconAlert } from "../components/Icons"

function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get("expired") === "true"

  const [formData, setFormData] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await loginUser(formData)
      const token = response?.token || response?.jwt

      if (!token) {
        throw new Error("The server did not return an authentication token.")
      }

      setAuthToken(token)
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Login failed. Please check your credentials and try again.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to your workspace"
      subtitle="Continue your preparation where you left off."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300"
          >
            Create one
          </Link>
        </>
      }
    >
      {sessionExpired && !error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
          <IconAlert size={15} className="mt-0.5 shrink-0" />
          Your session expired. Please sign in again to continue.
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Email address" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="you@example.com"
            className={inputClass}
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className={cx(inputClass, "pr-16")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-1.5 py-1 text-[11px] font-semibold text-ink-muted transition hover:text-brand-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </Field>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300"
          >
            <IconAlert size={15} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading && <Spinner />}
          {isLoading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  )
}

export default Login