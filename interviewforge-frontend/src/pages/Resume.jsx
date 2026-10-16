import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  getCachedAnalysis,
  getMyResumes,
  getResumeAnalysis,
  getSavedResumeId,
  getSavedResumeMeta,
  saveResumeMeta,
  uploadResume,
} from "../services/resumeService"
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeading,
  Skeleton,
  Spinner,
  
  selectClass,
} from "../components/ui"
import { cx } from "../lib/cx"
import {
  IconAlert,
  IconArrowRight,
  IconBulb,
  IconCheck,
  IconLayers,
  IconMic,
  IconRefresh,
  IconTarget,
  IconTrash,
  IconUpload,
} from "../components/Icons"
import { formatDate } from "../lib/metrics"

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ["pdf", "docx", "doc"]

const normalizeList = (data) => {
  if (!data) return []
  if (Array.isArray(data)) {
    return data
      .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
      .filter(Boolean)
  }
  if (typeof data === "string") {
    const trimmed = data.trim()
    if (!trimmed) return []
    if (trimmed.includes("\n")) {
      return trimmed
        .split("\n")
        .map((line) => line.replace(/^[-*•\d.]+\s*/, "").trim())
        .filter(Boolean)
    }
    return [trimmed]
  }
  return [String(data)]
}

const ANALYSIS_SECTIONS = [
  {
    key: "technicalSkills",
    title: "Technical skills",
    subtitle: "Technologies, languages and tools the AI found",
    badge: (n) => `${n} found`,
    tone: "brand",
    variant: "chips",
    icon: IconLayers,
    empty: "No technical skills were identified in this resume.",
  },
  {
    key: "strengths",
    title: "Key strengths",
    subtitle: "Demonstrated achievements and qualities",
    badge: (n) => `${n} items`,
    tone: "success",
    variant: "list",
    marker: "check",
    icon: IconCheck,
    empty: "No strengths were recorded for this resume.",
  },
  {
    key: "weaknesses",
    title: "Areas for improvement",
    subtitle: "Gaps and weaknesses worth addressing",
    badge: (n) => `${n} items`,
    tone: "warning",
    variant: "list",
    marker: "bang",
    icon: IconAlert,
    empty: "No critical weaknesses were identified.",
  },
  {
    key: "missingSkills",
    title: "Missing skills",
    subtitle: "High-demand skills you should consider adding",
    badge: (n) => `${n} skills`,
    tone: "danger",
    variant: "chips",
    icon: IconTarget,
    empty: "No missing skills were identified for this profile.",
  },
  {
    key: "projectFeedback",
    title: "Project feedback",
    subtitle: "Clarity, impact and technical depth of your projects",
    badge: (n) => `${n} items`,
    tone: "info",
    variant: "list",
    marker: "arrow",
    icon: IconLayers,
    empty: "No project-specific feedback was returned.",
  },
  {
    key: "suggestions",
    title: "Suggestions",
    subtitle: "Actionable steps to improve this resume",
    badge: (n) => `${n} tips`,
    tone: "coral",
    variant: "list",
    marker: "star",
    icon: IconBulb,
    empty: "No additional suggestions were provided.",
  },
]

const MARKERS = {
  check: { glyph: "✓", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
  bang: { glyph: "!", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  arrow: { glyph: "→", className: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300" },
  star: { glyph: "★", className: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300" },
}

const CHIP_TONES = {
  brand: "border-brand-100 bg-brand-50 text-brand-600 dark:border-brand-500/25 dark:bg-brand-500/12 dark:text-brand-300",
  danger: "border-red-100 bg-red-50 text-red-600 dark:border-red-500/25 dark:bg-red-500/12 dark:text-red-300",
}

const LIST_TONES = {
  success: "border-emerald-100 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/8",
  warning: "border-amber-100 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/8",
  info: "border-sky-100 bg-sky-50/60 dark:border-sky-500/20 dark:bg-sky-500/8",
  coral: "border-orange-100 bg-orange-50/60 dark:border-orange-500/20 dark:bg-orange-500/8",
}

const SECTION_ICON_TONES = {
  brand: "bg-brand-50 text-brand-500 dark:bg-brand-500/12",
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/12",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-500/12",
  danger: "bg-red-50 text-red-600 dark:bg-red-500/12",
  info: "bg-sky-50 text-sky-600 dark:bg-sky-500/12",
  coral: "bg-orange-50 text-orange-600 dark:bg-orange-500/12",
}

/* ------------------------------ Upload zone ------------------------------ */

function Dropzone({ selectedFile, disabled, onFile, inputId }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cx(
        "rounded-2xl border-2 border-dashed p-7 text-center transition sm:p-9",
        isDragging
          ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
          : "border-brand-200 bg-indigo-50/40 dark:border-brand-500/30 dark:bg-brand-500/6",
      )}
    >
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-500 shadow-card dark:bg-white/8">
        <IconUpload size={24} />
      </span>

      <h3 className="mt-5 text-base font-semibold text-ink">
        {selectedFile ? "Ready to upload" : "Drop your resume here"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-muted">
        Upload your latest resume in PDF, DOCX or DOC format (max 10 MB). We
        extract the text and send it to the AI analyzer.
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        <label
          htmlFor={inputId}
          className={cx(
            "inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition",
            disabled
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:bg-brand-600",
          )}
        >
          <IconUpload size={16} />
          {selectedFile ? "Choose a different file" : "Choose file"}
        </label>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,.docx,.doc"
          disabled={disabled}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onFile(file)
            event.target.value = ""
          }}
        />
      </div>

      <p className="mt-4 text-[11px] text-ink-faint">
        Supported formats: PDF, DOCX, DOC · Maximum 10 MB
      </p>
    </div>
  )
}

/* --------------------------- Analysis sections --------------------------- */

function AnalysisSection({ section, items }) {
  const SectionIcon = section.icon
  const iconTone = SECTION_ICON_TONES[section.tone]

  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              iconTone,
            )}
          >
            <SectionIcon size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink">{section.title}</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
              {section.subtitle}
            </p>
          </div>
        </div>
        <Badge tone={section.tone}>{section.badge(items.length)}</Badge>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-center text-[11px] italic text-ink-faint">
          {section.empty}
        </p>
      ) : section.variant === "chips" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${section.key}-${item}-${index}`}
              className={cx(
                "rounded-lg border px-2.5 py-1 text-xs font-medium",
                CHIP_TONES[section.tone],
              )}
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item, index) => {
            const marker = MARKERS[section.marker]
            return (
              <li
                key={`${section.key}-${index}`}
                className={cx(
                  "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs leading-relaxed text-ink-soft",
                  LIST_TONES[section.tone],
                )}
              >
                <span
                  className={cx(
                    "mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold",
                    marker.className,
                  )}
                  aria-hidden="true"
                >
                  {marker.glyph}
                </span>
                <span>{item}</span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/* --------------------------------- Page ---------------------------------- */

function Resume() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadedResume, setUploadedResume] = useState(() => getSavedResumeMeta())
  const [userResumes, setUserResumes] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [analysis, setAnalysis] = useState(() => {
    const savedId = getSavedResumeId()
    return savedId ? getCachedAnalysis(savedId) : null
  })

  const isBusy = isUploading || isAnalyzing

  useEffect(() => {
    let mounted = true

    getMyResumes()
      .then((list) => {
        if (!mounted || !Array.isArray(list) || list.length === 0) return
        setUserResumes(list)

        const savedId = getSavedResumeId()
        const matching = list.find((r) => r.id === savedId) || list[0]
        const meta = {
          name: matching.fileName,
          resumeId: matching.id,
          uploadedAt: matching.uploadedAt
            ? new Date(matching.uploadedAt).toLocaleDateString()
            : "Saved",
        }
        setUploadedResume(meta)
        saveResumeMeta(meta)

        const cached = getCachedAnalysis(matching.id)
        if (cached) setAnalysis(cached)
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [])

  const runAnalysis = async (resumeId) => {
    if (!resumeId || isAnalyzing) return

    setError(null)
    setIsAnalyzing(true)

    try {
      const data = await getResumeAnalysis(resumeId)
      setAnalysis(data)
    } catch (err) {
      setError({
        type: "analysis",
        message:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Analysis could not be generated. Please try again.",
        resumeId,
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFile = (file) => {
    const lower = file.name.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`))) {
      setError({
        type: "upload",
        message: "Unsupported file format. Please select a PDF, DOCX or DOC resume.",
      })
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError({
        type: "upload",
        message: "File exceeds the 10 MB size limit. Please choose a smaller file.",
      })
      return
    }
    setSelectedFile(file)
    setError(null)
  }

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile || isBusy) return

    setError(null)
    setIsUploading(true)

    try {
      const uploadResponse = await uploadResume(selectedFile)
      const createdResumeId = uploadResponse?.resumeId

      if (!createdResumeId) {
        throw new Error(
          uploadResponse?.message ||
            "Resume uploaded, but the server did not return a resume ID.",
        )
      }

      const meta = {
        name: selectedFile.name,
        resumeId: createdResumeId,
        uploadedAt: formatDate(new Date()),
      }
      saveResumeMeta(meta)
      setUploadedResume(meta)
      setSelectedFile(null)
      setIsUploading(false)

      getMyResumes()
        .then((list) => Array.isArray(list) && setUserResumes(list))
        .catch(() => {})

      await runAnalysis(createdResumeId)
    } catch (err) {
      setError({
        type: "upload",
        message:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          (typeof err?.response?.data === "string" ? err.response.data : null) ||
          err?.message ||
          "Resume upload failed. Please verify the file and try again.",
      })
      setIsUploading(false)
    }
  }

  const handleSelectExistingResume = (resume) => {
    const meta = {
      name: resume.fileName,
      resumeId: resume.id,
      uploadedAt: resume.uploadedAt
        ? new Date(resume.uploadedAt).toLocaleDateString()
        : "Saved",
    }
    saveResumeMeta(meta)
    setUploadedResume(meta)
    setError(null)
    setAnalysis(getCachedAnalysis(resume.id) || null)
  }

  const normalized = {
    technicalSkills: normalizeList(analysis?.technicalSkills),
    strengths: normalizeList(analysis?.strengths),
    weaknesses: normalizeList(analysis?.weaknesses),
    missingSkills: normalizeList(analysis?.missingSkills),
    projectFeedback: normalizeList(analysis?.projectFeedback),
    suggestions: normalizeList(analysis?.suggestions),
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Resume"
        title="Resume review"
        description="Upload your resume and let InterviewForge AI extract your skills, strengths, gaps and project feedback."
        actions={
          uploadedResume?.resumeId && (
            <button
              type="button"
              onClick={() => navigate(`/interview?resumeId=${uploadedResume.resumeId}`)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-pill transition hover:bg-brand-600"
            >
              <IconMic size={16} />
              Start mock interview
              <IconArrowRight size={15} />
            </button>
          )
        }
      />

      {/* Upload */}
      <Card className="p-0">
        <div className="p-5 sm:p-6">
          <Dropzone
            inputId="resume-upload"
            selectedFile={selectedFile}
            disabled={isBusy}
            onFile={handleFile}
          />
        </div>

        {selectedFile && (
          <div className="mx-5 mb-5 flex flex-col gap-3 rounded-xl border border-line bg-surface-muted p-4 sm:mx-6 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/12">
                <IconLayers size={18} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {selectedFile.name}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · ready to
                  send
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                disabled={isBusy}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-muted transition hover:border-red-200 hover:text-red-500 disabled:opacity-40"
                aria-label="Remove selected file"
              >
                <IconTrash size={15} />
              </button>
              <Button onClick={handleUploadAndAnalyze} disabled={isBusy}>
                {isBusy ? <Spinner /> : <IconUpload size={15} />}
                {isUploading
                  ? "Uploading…"
                  : isAnalyzing
                    ? "Analyzing…"
                    : "Upload & analyze"}
              </Button>
            </div>
          </div>
        )}

        {(isUploading || isAnalyzing) && (
          <div
            role="status"
            className="mx-5 mb-5 flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 p-3.5 text-sm text-brand-700 sm:mx-6 sm:mb-6 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-300"
          >
            <Spinner />
            <span>
              {isUploading
                ? "Uploading resume and extracting text…"
                : "InterviewForge AI is analyzing your resume…"}
            </span>
          </div>
        )}

        {error && (
          <div className="mx-5 mb-5 sm:mx-6 sm:mb-6">
            <ErrorState
              message={`${
                error.type === "upload" ? "Upload failed. " : "Analysis failed. "
              }${error.message}`}
              onRetry={
                error.type === "analysis" && error.resumeId
                  ? () => runAnalysis(error.resumeId)
                  : undefined
              }
            />
          </div>
        )}
      </Card>

      {/* Active resume */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/12">
              <IconLayers size={19} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {uploadedResume?.name ||
                  (selectedFile ? selectedFile.name : "No resume uploaded yet")}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                {uploadedResume?.resumeId ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Ready · Resume #{uploadedResume.resumeId}
                  </span>
                ) : selectedFile ? (
                  <span className="text-brand-600 dark:text-brand-300">
                    Ready to upload and analyze
                  </span>
                ) : (
                  "Choose a file above to begin AI evaluation"
                )}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            {userResumes.length > 1 && (
              <label htmlFor="resume-switch" className="sr-only">
                Switch active resume
              </label>
            )}
            {userResumes.length > 1 && (
              <select
                id="resume-switch"
                value={uploadedResume?.resumeId || ""}
                onChange={(event) => {
                  const chosen = userResumes.find(
                    (r) => r.id === Number(event.target.value),
                  )
                  if (chosen) handleSelectExistingResume(chosen)
                }}
                disabled={isBusy}
                className={cx(selectClass, "w-auto py-2 text-xs")}
              >
                {userResumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.id} — {r.fileName}
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (uploadedResume?.resumeId) runAnalysis(uploadedResume.resumeId)
                else if (selectedFile) handleUploadAndAnalyze()
              }}
              disabled={(!uploadedResume && !selectedFile) || isBusy}
            >
              {isBusy ? <Spinner /> : <IconRefresh size={14} />}
              {isUploading
                ? "Uploading…"
                : isAnalyzing
                  ? "Analyzing…"
                  : analysis
                    ? "Re-analyze"
                    : "Analyze resume"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Analysis */}
      {isAnalyzing && !analysis ? (
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-2.5 w-3/4" />
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
              </div>
            </Card>
          ))}
        </div>
      ) : analysis ? (
        <section aria-labelledby="analysis-heading" className="space-y-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-500">
                  AI evaluation complete
                </p>
              </div>
              <h2 id="analysis-heading" className="mt-1.5 text-xl font-bold text-ink">
                Analysis results
              </h2>
            </div>
            {uploadedResume?.name && (
              <p className="text-[11px] text-ink-muted">
                Evaluated for{" "}
                <span className="font-semibold text-ink-soft">
                  {uploadedResume.name}
                </span>
              </p>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {ANALYSIS_SECTIONS.map((section) => (
              <AnalysisSection
                key={section.key}
                section={section}
                items={normalized[section.key]}
              />
            ))}
          </div>
        </section>
      ) : (
        <Card className="p-0">
          <EmptyState
            icon={<IconBulb size={24} />}
            title="No analysis yet"
            description="Upload a resume above and InterviewForge AI will return real extracted skills, strengths, weaknesses, missing skills, project feedback and suggestions."
            action={
              uploadedResume?.resumeId && (
                <Button onClick={() => runAnalysis(uploadedResume.resumeId)}>
                  Analyze my resume
                </Button>
              )
            }
          />
        </Card>
      )}
    </div>
  )
}

export default Resume