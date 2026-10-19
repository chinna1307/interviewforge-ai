import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  clearCachedAnalysis,
  getCachedAnalysis,
  getCurrentResume,
  getMyResumes,
  getResumeAnalysis,
  getSavedResumeId,
  getSavedResumeMeta,
  replaceResume,
  retryResume,
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

/* ----------------------- Replace Confirmation Modal ----------------------- */

function ReplaceConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  currentResumeName,
  newFileName,
  isBusy,
}) {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="replace-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !isBusy) onClose()
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl transition-all dark:bg-[#18181b]">
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <IconAlert size={22} />
          </span>
          <div className="min-w-0">
            <h3 id="replace-dialog-title" className="text-base font-bold text-ink">
              Replace your resume?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              You already have a resume uploaded. If you continue, your current resume, its AI analysis, and its indexed data will be replaced by the new resume. This action cannot be undone.
            </p>
          </div>
        </div>

        {(currentResumeName || newFileName) && (
          <div className="mt-4 space-y-2 rounded-xl border border-line bg-surface-muted p-3 text-xs">
            {currentResumeName && (
              <div className="flex items-center justify-between text-ink-muted">
                <span className="font-medium">Current resume:</span>
                <span className="max-w-[210px] truncate font-semibold text-ink">{currentResumeName}</span>
              </div>
            )}
            {newFileName && (
              <div className="flex items-center justify-between text-ink-muted">
                <span className="font-medium">Replacement:</span>
                <span className="max-w-[210px] truncate font-semibold text-brand-600 dark:text-brand-400">{newFileName}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isBusy}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            disabled={isBusy}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isBusy ? <Spinner /> : null}
            Replace resume
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ Upload zone ------------------------------ */

function Dropzone({ selectedFile, disabled, onFile, inputId, label = "Choose file", subtitle }) {
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
        {subtitle || "Upload your resume in PDF, DOCX or DOC format (max 10 MB). We extract the text and generate 768-dimensional AI embeddings for personalized interview prep."}
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
          {selectedFile ? "Choose a different file" : label}
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
        Supported formats: PDF, DOCX, DOC · Maximum 10 MB · Exactly one active resume per account
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
  const replaceInputRef = useRef(null)

  const [selectedFile, setSelectedFile] = useState(null)
  const [pendingReplaceFile, setPendingReplaceFile] = useState(null)
  const [showReplaceModal, setShowReplaceModal] = useState(false)
  const [uploadedResume, setUploadedResume] = useState(() => getSavedResumeMeta())

  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [duplicateNotice, setDuplicateNotice] = useState(null)
  const [error, setError] = useState(null)
  const [analysis, setAnalysis] = useState(() => {
    const savedId = getSavedResumeId()
    return savedId ? getCachedAnalysis(savedId) : null
  })

  const isBusy = isUploading || isAnalyzing || isRetrying

  const runAnalysis = useCallback(async (resumeId) => {
    if (!resumeId) return

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
  }, [])

  useEffect(() => {
    let mounted = true

    getCurrentResume()
      .then((active) => {
        if (!mounted) return
        if (active && active.id) {
          const meta = {
            name: active.fileName,
            resumeId: active.id,
            status: active.status || "READY",
            uploadedAt: active.uploadedAt
              ? new Date(active.uploadedAt).toLocaleDateString()
              : "Active",
          }
          setUploadedResume(meta)
          saveResumeMeta(meta)

          const cached = getCachedAnalysis(active.id)
          if (cached) {
            setAnalysis(cached)
          } else if (active.status !== "FAILED") {
            runAnalysis(active.id)
          }
        } else {
          // Fallback check to getMyResumes
          getMyResumes()
            .then((list) => {
              if (!mounted || !Array.isArray(list) || list.length === 0) return
              const first = list[0]
              const meta = {
                name: first.fileName,
                resumeId: first.id,
                status: first.status || "READY",
                uploadedAt: first.uploadedAt
                  ? new Date(first.uploadedAt).toLocaleDateString()
                  : "Saved",
              }
              setUploadedResume(meta)
              saveResumeMeta(meta)

              const cached = getCachedAnalysis(first.id)
              if (cached) setAnalysis(cached)
            })
            .catch(() => {})
        }
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [runAnalysis])

  const validateFile = (file) => {
    const lower = file.name.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`))) {
      setError({
        type: "upload",
        message: "Unsupported file format. Please select a PDF, DOCX or DOC resume.",
      })
      return false
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError({
        type: "upload",
        message: "File exceeds the 10 MB size limit. Please choose a smaller file.",
      })
      return false
    }
    return true
  }

  // Handler for first-time upload selection
  const handleFirstUploadFile = (file) => {
    if (!validateFile(file)) return
    setSelectedFile(file)
    setDuplicateNotice(null)
    setError(null)
  }

  // Handler when selecting a replacement file
  const handleSelectReplacementFile = (file) => {
    if (!validateFile(file)) return
    setError(null)
    setDuplicateNotice(null)
    setPendingReplaceFile(file)
    setShowReplaceModal(true)
  }

  // Confirm replacement action
  const handleConfirmReplacement = async () => {
    if (!pendingReplaceFile || isBusy) return

    const fileToUpload = pendingReplaceFile
    setShowReplaceModal(false)
    setError(null)
    setDuplicateNotice(null)
    setIsUploading(true)

    // Requirement 8: Never display previous resume's analysis as analysis of replacement
    setAnalysis(null)
    if (uploadedResume?.resumeId) {
      clearCachedAnalysis(uploadedResume.resumeId)
    }

    try {
      const uploadResponse = await replaceResume(fileToUpload)
      const createdResumeId = uploadResponse?.resumeId
      const status = uploadResponse?.status || "READY"
      const isDuplicate = Boolean(uploadResponse?.duplicate)

      if (!createdResumeId) {
        throw new Error(
          uploadResponse?.message || "Resume upload completed, but no resume ID was returned.",
        )
      }

      const meta = {
        name: fileToUpload.name,
        resumeId: createdResumeId,
        status,
        uploadedAt: formatDate(new Date()),
      }
      saveResumeMeta(meta)
      setUploadedResume(meta)
      setPendingReplaceFile(null)
      setIsUploading(false)

      if (isDuplicate) {
        setDuplicateNotice({
          resumeId: createdResumeId,
          fileName: fileToUpload.name,
          status,
          message:
            uploadResponse?.message ||
            "You've already uploaded this resume. View your existing analysis or re-analyze it.",
        })
        const cached = getCachedAnalysis(createdResumeId)
        if (cached) setAnalysis(cached)
        return
      }

      if (status === "FAILED") {
        setError({
          type: "indexing",
          message:
            uploadResponse?.message ||
            "Replacement resume uploaded and text extracted, but vector indexing failed. Click Retry to complete indexing.",
          resumeId: createdResumeId,
        })
        return
      }

      // Fetch fresh analysis for the replacement resume only
      await runAnalysis(createdResumeId)
    } catch (err) {
      setIsUploading(false)
      setError({
        type: "upload",
        message:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          (typeof err?.response?.data === "string" ? err.response.data : null) ||
          err?.message ||
          "Resume replacement failed. Please verify the file and try again.",
      })
    }
  }

  const handleCancelReplacement = () => {
    setPendingReplaceFile(null)
    setShowReplaceModal(false)
  }

  const handleUploadFirstResume = async () => {
    if (!selectedFile || isBusy) return

    setError(null)
    setDuplicateNotice(null)
    setIsUploading(true)

    try {
      const uploadResponse = await uploadResume(selectedFile, false)
      const createdResumeId = uploadResponse?.resumeId
      const status = uploadResponse?.status || "READY"
      const isDuplicate = Boolean(uploadResponse?.duplicate)

      if (!createdResumeId) {
        throw new Error(
          uploadResponse?.message || "Resume uploaded, but server did not return a resume ID.",
        )
      }

      const meta = {
        name: selectedFile.name,
        resumeId: createdResumeId,
        status,
        uploadedAt: formatDate(new Date()),
      }
      saveResumeMeta(meta)
      setUploadedResume(meta)
      setSelectedFile(null)
      setIsUploading(false)

      if (isDuplicate) {
        setDuplicateNotice({
          resumeId: createdResumeId,
          fileName: selectedFile.name,
          status,
          message:
            uploadResponse?.message ||
            "You've already uploaded this resume. View your existing analysis or re-analyze it.",
        })
        const cached = getCachedAnalysis(createdResumeId)
        if (cached) setAnalysis(cached)
        return
      }

      if (status === "FAILED") {
        setError({
          type: "indexing",
          message:
            uploadResponse?.message ||
            "Resume text extracted, but vector indexing failed. Click Retry to complete indexing.",
          resumeId: createdResumeId,
        })
        return
      }

      await runAnalysis(createdResumeId)
    } catch (err) {
      setIsUploading(false)
      if (err?.response?.status === 409) {
        // Confirmation required by server
        setPendingReplaceFile(selectedFile)
        setSelectedFile(null)
        setShowReplaceModal(true)
        return
      }
      setError({
        type: "upload",
        message:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          (typeof err?.response?.data === "string" ? err.response.data : null) ||
          err?.message ||
          "Resume upload failed. Please verify the file and try again.",
      })
    }
  }

  const handleRetryIndexing = async (resumeId) => {
    if (!resumeId || isBusy) return

    setError(null)
    setIsRetrying(true)

    try {
      const res = await retryResume(resumeId)
      setIsRetrying(false)
      if (res?.status === "READY") {
        setUploadedResume((prev) => ({ ...prev, status: "READY" }))
        await runAnalysis(resumeId)
      } else {
        setError({
          type: "indexing",
          message: res?.message || "Vector indexing retry failed. Please try again.",
          resumeId,
        })
      }
    } catch (err) {
      setIsRetrying(false)
      setError({
        type: "indexing",
        message:
          err?.response?.data?.message ||
          err?.message ||
          "Retry request failed. Please try again.",
        resumeId,
      })
    }
  }

  const handleReanalyze = (resumeId) => {
    setDuplicateNotice(null)
    runAnalysis(resumeId)
  }

  const normalized = {
    technicalSkills: normalizeList(analysis?.technicalSkills),
    strengths: normalizeList(analysis?.strengths),
    weaknesses: normalizeList(analysis?.weaknesses),
    missingSkills: normalizeList(analysis?.missingSkills),
    projectFeedback: normalizeList(analysis?.projectFeedback),
    suggestions: normalizeList(analysis?.suggestions),
  }

  const hasActiveResume = Boolean(uploadedResume?.resumeId)

  return (
    <div className="space-y-6">
      {/* Confirmation Modal */}
      <ReplaceConfirmationModal
        isOpen={showReplaceModal}
        onClose={handleCancelReplacement}
        onConfirm={handleConfirmReplacement}
        currentResumeName={uploadedResume?.name}
        newFileName={pendingReplaceFile?.name}
        isBusy={isBusy}
      />

      <PageHeading
        eyebrow="Resume"
        title="Resume review"
        description="Upload your resume and let InterviewForge AI extract your skills, strengths, gaps and project feedback."
        actions={
          hasActiveResume && (
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

      {/* Active Resume Card (Shown when user has a resume uploaded) */}
      {hasActiveResume && (
        <Card className="p-6 border-brand-200/70 bg-gradient-to-r from-surface to-brand-50/30 dark:border-brand-500/20 dark:to-brand-500/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-card">
                <IconLayers size={22} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-base font-bold text-ink">
                    {uploadedResume.name}
                  </p>
                  <Badge tone={uploadedResume.status === "FAILED" ? "warning" : (uploadedResume.status === "INDEXING_PENDING" ? "brand" : "success")}>
                    {uploadedResume.status === "FAILED"
                      ? "Indexing failed"
                      : (uploadedResume.status === "INDEXING_PENDING"
                        ? "Indexing pending"
                        : "Active & indexed")}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {uploadedResume.status === "FAILED" ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Vector indexing failed · Click Retry indexing below
                    </span>
                  ) : uploadedResume.status === "INDEXING_PENDING" ? (
                    <span className="text-brand-600 dark:text-brand-400 font-medium">
                      Analysis available · Vector indexing pending for mock interview prep
                    </span>
                  ) : (
                    <span>
                      Ready & indexed with 768-dim embeddings · Uploaded {uploadedResume.uploadedAt || "recently"}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              {(uploadedResume.status === "FAILED" || uploadedResume.status === "INDEXING_PENDING") && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleRetryIndexing(uploadedResume.resumeId)}
                  disabled={isBusy}
                >
                  {isRetrying ? <Spinner /> : <IconRefresh size={14} />}
                  Retry indexing
                </Button>
              )}

              {/* Replace resume file input & trigger */}
              <input
                ref={replaceInputRef}
                id="replace-resume-input"
                type="file"
                accept=".pdf,.docx,.doc"
                disabled={isBusy}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleSelectReplacementFile(file)
                  e.target.value = ""
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => replaceInputRef.current?.click()}
                disabled={isBusy}
              >
                <IconUpload size={14} />
                Replace resume
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleReanalyze(uploadedResume.resumeId)}
                disabled={isBusy}
              >
                {isAnalyzing ? <Spinner /> : <IconRefresh size={14} />}
                {analysis ? "Re-analyze" : "Analyze"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Upload Zone (Displayed if user has no resume yet) */}
      {!hasActiveResume && (
        <Card className="p-0">
          <div className="p-5 sm:p-6">
            <Dropzone
              inputId="first-resume-upload"
              selectedFile={selectedFile}
              disabled={isBusy}
              onFile={handleFirstUploadFile}
              label="Choose resume file"
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
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · ready to upload
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
                <Button onClick={handleUploadFirstResume} disabled={isBusy}>
                  {isBusy ? <Spinner /> : <IconUpload size={15} />}
                  {isUploading ? "Uploading & indexing…" : "Upload & analyze"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Duplicate resume notification banner */}
      {duplicateNotice && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-5 dark:border-brand-500/25 dark:bg-brand-500/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                <IconLayers size={20} />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-ink">
                  Identical resume detected
                </h4>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {duplicateNotice.message}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDuplicateNotice(null)
                  runAnalysis(duplicateNotice.resumeId)
                }}
              >
                View analysis
              </Button>
              <button
                type="button"
                onClick={() => setDuplicateNotice(null)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Dismiss notice"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading status indicator */}
      {(isUploading || isAnalyzing || isRetrying) && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-300"
        >
          <Spinner />
          <span>
            {isUploading
              ? "Validating resume, extracting text and indexing 768-dim embeddings…"
              : isRetrying
                ? "Retrying vector embedding indexing into PGVector…"
                : "InterviewForge AI is analyzing your active resume…"}
          </span>
        </div>
      )}

      {/* Error State with clear retry action */}
      {error && (
        <ErrorState
          message={`${
            error.type === "upload"
              ? "Upload failed: "
              : error.type === "indexing"
                ? "Vector indexing issue: "
                : "Analysis failed: "
          }${error.message}`}
          onRetry={
            error.type === "analysis" && error.resumeId
              ? () => runAnalysis(error.resumeId)
              : error.type === "indexing" && error.resumeId
                ? () => handleRetryIndexing(error.resumeId)
                : undefined
          }
        />
      )}

      {/* Analysis Results */}
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
            description="Upload or activate a resume above to have InterviewForge AI evaluate your skills, strengths, weaknesses, project depth and improvement tips."
            action={
              hasActiveResume && (
                <Button onClick={() => runAnalysis(uploadedResume.resumeId)}>
                  Analyze active resume
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