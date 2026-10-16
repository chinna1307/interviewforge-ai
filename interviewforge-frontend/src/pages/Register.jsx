import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { registerUser } from "../services/authService"
import AuthLayout from "../components/AuthLayout"
import { Button, Field, Spinner, inputClass } from "../components/ui"
import { IconAlert, IconCheck } from "../components/Icons"

function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ name: "", email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setSuccessMessage("")
    setIsLoading(true)

    try {
      await registerUser(formData)
      setSuccessMessage("Account created. Redirecting you to sign in…")
      setTimeout(() => navigate("/login", { replace: true }), 900)
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Registration failed. Please try again.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  const passwordTooShort = formData.password.length > 0 && formData.password.length < 6

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your account"
      subtitle="Free to set up. Upload a resume and run your first interview in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Full name" htmlFor="name">
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Your name"
            className={inputClass}
          />
        </Field>

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

        <Field
          label="Password"
          htmlFor="password"
          hint={
            passwordTooShort ? (
              <span className="text-amber-600 dark:text-amber-400">
                Password must be at least 6 characters.
              </span>
            ) : (
              "Minimum 6 characters."
            )
          }
        >
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="••••••••"
              className={`${inputClass} pr-16`}
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

        {successMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
            <IconCheck size={15} className="mt-0.5 shrink-0" />
            {successMessage}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading && <Spinner />}
          {isLoading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  )
}

export default Register