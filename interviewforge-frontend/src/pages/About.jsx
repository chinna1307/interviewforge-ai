import { useNavigate } from "react-router-dom"
import { Badge, Card } from "../components/ui"
import {
  IconArrowRight,
  IconChart,
  IconCheck,
  IconHistory,
  IconMic,
  IconResume,
  IconSparkles,
  IconTarget,
} from "../components/Icons"

const CHALLENGES = [
  {
    title: "Never faced a real interview",
    description:
      "Most students learn data structures and theory, but never experience the pacing, pressure, or phrasing of an actual technical interview before campus placements.",
  },
  {
    title: "Nervous when speaking under pressure",
    description:
      "Knowing an answer in your head is different from articulating it clearly to an interviewer. Practice is the only proven way to calm nerves.",
  },
  {
    title: "Struggling to explain project depth",
    description:
      "Interviewers probe deep into design choices, trade-offs, and technical challenges in your projects. Many candidates struggle to explain 'why' they built things a certain way.",
  },
  {
    title: "Not knowing strengths and blind spots",
    description:
      "Without honest, structured feedback after practicing, it is difficult to know whether your answers are meeting industry expectations or where to focus next.",
  },
  {
    title: "Needing realistic campus placement prep",
    description:
      "Students want practice that feels close to actual technical rounds — grounded in their own background, not generic LeetCode flashcards.",
  },
]

const FEATURES = [
  {
    icon: IconResume,
    tag: "Resume Analysis",
    title: "AI Resume Review",
    description:
      "Upload your PDF or DOCX resume to extract key technical skills, identify strengths, and get constructive suggestions on what to highlight or improve.",
  },
  {
    icon: IconMic,
    tag: "Adaptive Practice",
    title: "Personalized Mock Interviews",
    description:
      "Practice technical, project, backend, and problem-solving questions generated specifically from your active resume's declared technologies and projects.",
  },
  {
    icon: IconCheck,
    tag: "Immediate Scoring",
    title: "Answer Evaluation & Feedback",
    description:
      "Submit your answers and get immediate scores out of 10 alongside written evaluation explaining what was strong and what detail was missing.",
  },
  {
    icon: IconChart,
    tag: "Detailed Analytics",
    title: "Interview Reports",
    description:
      "Review a comprehensive performance summary after every completed interview, highlighting overall score, category breakdown, key strengths, and areas to target.",
  },
  {
    icon: IconHistory,
    tag: "Progress Tracking",
    title: "Practice History",
    description:
      "Revisit your previous interview sessions, answer reviews, and past performance reports to track your measurable progress over time.",
  },
]

const STEPS = [
  {
    step: "01",
    title: "Upload & analyze your resume",
    description:
      "Add your PDF or DOCX resume. The system indexes your technologies, experience, and project domains to ground your interview.",
  },
  {
    step: "02",
    title: "Start a personalized interview",
    description:
      "Launch a 5-question mock session tailored specifically to the technologies and claims on your active resume.",
  },
  {
    step: "03",
    title: "Answer and review feedback",
    description:
      "Type your responses thoughtfully. The AI interviewer grades each response with actionable, constructive feedback.",
  },
  {
    step: "04",
    title: "Study your report & practice again",
    description:
      "Examine your overall score and recommendations, review your weak spots, and start another session when ready.",
  },
]

const AUDIENCES = [
  {
    label: "College Students",
    subtitle: "Preparing for campus placements",
    description:
      "Bridge the gap between theoretical coursework and the interactive expectations of placement interviews.",
  },
  {
    label: "Fresh Graduates",
    subtitle: "Heading into entry-level roles",
    description:
      "Build confidence talking about your skills, internships, and capstone projects before your first corporate round.",
  },
  {
    label: "Project Builders",
    subtitle: "Developers explaining technical decisions",
    description:
      "Practice answering probing questions about architecture, trade-offs, and database decisions in your personal work.",
  },
  {
    label: "Active Job Seekers",
    subtitle: "Anyone wanting structured practice",
    description:
      "Warm up in a low-stakes environment anytime, anywhere, before sitting down in front of a real hiring panel.",
  },
]

export default function About() {
  const navigate = useNavigate()

  return (
    <div className="space-y-10 pb-8">
      {/* Hero Section */}
      <Card className="relative overflow-hidden p-6 sm:p-10">
        <span
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/15"
          aria-hidden="true"
        />

        <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2">
              <Badge tone="brand">About the Platform</Badge>
              <span className="text-xs text-ink-muted">Student-focused interview prep</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-4xl">
              About InterviewForge AI
            </h1>

            <p className="text-base font-semibold text-brand-600 dark:text-brand-400 sm:text-lg">
              “Your first step toward becoming interview-ready.”
            </p>

            <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
              An AI-powered interview preparation platform designed to help students practice,
              improve, and approach real interviews with greater confidence. Practice at your own
              pace in a low-stress environment without the pressure of a human panel.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/interview")}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-pill transition hover:bg-brand-600"
              >
                <IconMic size={16} />
                Start Mock Interview
                <IconArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/resume")}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
              >
                <IconResume size={16} />
                Review My Resume
              </button>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-center self-center lg:self-auto">
            <img
              src="/images/interviewforge-logo.png"
              alt="InterviewForge AI Logo"
              className="h-32 sm:h-40 w-auto object-contain drop-shadow-[0_12px_24px_rgba(108,92,231,0.2)]"
            />
          </div>
        </div>
      </Card>

      {/* Why We Built This Platform */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-500">
            <IconTarget size={14} />
            <span>The Challenge</span>
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Why we built InterviewForge AI
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Many students have solid programming knowledge and project experience, but walk into
            interviews feeling unprepared for the conversation itself. Here is why that happens:
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHALLENGES.map((item, index) => (
            <Card key={item.title} className="flex flex-col justify-between p-5">
              <div>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-sm font-bold text-ink">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">{item.description}</p>
              </div>
            </Card>
          ))}
          <Card className="flex flex-col justify-center border-dashed border-brand-200 bg-brand-50/50 p-5 dark:border-brand-500/30 dark:bg-brand-500/5 sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Our core belief
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              Interviewing is a skill, not a test of innate personality. Like coding, it improves
              steadily with deliberate practice.
            </p>
          </Card>
        </div>
      </section>

      {/* What You Can Do */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-500">
            <IconSparkles size={14} />
            <span>Core Capabilities</span>
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">
            What you can do with InterviewForge AI
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Everything on InterviewForge is grounded in your real profile — no generic questionnaires
            or unhelpful robotic answers.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
                      <Icon size={19} />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      {feature.tag}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-muted">{feature.description}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-500">
            <IconChart size={14} />
            <span>Process</span>
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">How it works</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
            A simple, predictable preparation workflow designed to fit your study schedule.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <Card key={s.step} className="relative p-5">
              <span className="text-2xl font-black text-brand-500/30 dark:text-brand-400/25">
                {s.step}
              </span>
              <h3 className="mt-2 text-sm font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">{s.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Who is this for? */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-500">
            <IconTarget size={14} />
            <span>Target Audience</span>
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">Who is this for?</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Whether you are weeks away from placement season or simply exploring what tech rounds look like.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((item) => (
            <Card key={item.label} className="p-5">
              <h3 className="text-sm font-bold text-ink">{item.label}</h3>
              <p className="mt-0.5 text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                {item.subtitle}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">{item.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-brand-500/10 via-brand-500/5 to-transparent p-6 sm:p-10">
        <div className="max-w-2xl space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            “Your next interview starts with practice.”
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            You don't need to be perfect before you begin. Start practicing, learn from your
            feedback, and improve one interview at a time.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => navigate("/interview")}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-pill transition hover:bg-brand-600"
            >
              <IconMic size={16} />
              Start Mock Interview
              <IconArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/resume")}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
            >
              <IconResume size={16} />
              Review My Resume
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
