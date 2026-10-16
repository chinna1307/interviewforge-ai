import { useId } from "react"

const BRAND = "#6C5CE7"
const EMERALD = "#10B981"

/* ------------------------------------------------------------------ */
/* Circular ring gauge                                                  */
/* ------------------------------------------------------------------ */

export function ScoreRing({
  value = 0,
  max = 10,
  size = 132,
  stroke = 10,
  color = BRAND,
  trackColor = "var(--color-line)",
  primary,
  secondary,
  caption,
}) {
  const gradientId = useId()
  const safeMax = max > 0 ? max : 10
  const clamped = Math.max(0, Math.min(value, safeMax))
  const percent = (clamped / safeMax) * 100

  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - percent / 100)
  const center = size / 2

  const label =
    primary ?? `${Math.round(percent)}%`
  const sub = secondary ?? `${Number(clamped.toFixed?.(2) ?? clamped)} / ${safeMax}`

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}. ${caption || ""}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0.62" />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums text-ink">{label}</span>
        <span className="mt-0.5 text-[11px] font-medium tabular-nums text-ink-muted">
          {sub}
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sparkline                                                            */
/* ------------------------------------------------------------------ */

export function Sparkline({
  values = [],
  color = BRAND,
  width = 92,
  height = 30,
  label = "Trend",
}) {
  const gradientId = useId()
  const points = values.filter((v) => Number.isFinite(v))

  if (points.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center"
        aria-hidden="true"
      >
        <span
          className="h-[3px] w-1/3 rounded-full"
          style={{ backgroundColor: "var(--color-line-strong)" }}
        />
      </div>
    )
  }

  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const stepX = width / (points.length - 1)
  const pad = 4

  const coords = points.map((v, i) => {
    const x = i * stepX
    const y = height - pad - ((v - min) / span) * (height - pad * 2)
    return [x, y]
  })

  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ")
  const area = `${line} L${width},${height} L0,${height} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${label}: ${points.length} data points, from ${points[0]} to ${points[points.length - 1]}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={coords[coords.length - 1][0]}
        cy={coords[coords.length - 1][1]}
        r="2.75"
        fill={color}
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Radar / spider chart                                                */
/* ------------------------------------------------------------------ */

export function RadarChart({
  axes = [],
  size = 260,
  color = BRAND,
  max = 10,
}) {
  const points = axes.filter((a) => Number.isFinite(a.value))
  const count = points.length

  if (count < 3) return null

  const center = size / 2
  const radius = size / 2 - 46
  const levels = [0.25, 0.5, 0.75, 1]

  const toXY = (index, ratio) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2
    return [center + Math.cos(angle) * radius * ratio, center + Math.sin(angle) * radius * ratio]
  }

  const ringPoints = (ratio) =>
    Array.from({ length: count }, (_, i) => toXY(i, ratio).map((n) => n.toFixed(2)).join(",")).join(" ")

  const valuePoints = points
    .map((a, i) => {
      const ratio = Math.max(0, Math.min((a.value ?? 0) / (max || 10), 1))
      return toXY(i, ratio).map((n) => n.toFixed(2)).join(",")
    })
    .join(" ")

  const spokeLines = points
    .map((_, i) => {
      const [x, y] = toXY(i, 1)
      return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="var(--color-line)" strokeWidth="1" />
    })

  const vertexDots = points.map((a, i) => {
    const ratio = Math.max(0, Math.min((a.value ?? 0) / (max || 10), 1))
    const [x, y] = toXY(i, ratio)
    return <circle key={`${a.label}-${i}`} cx={x} cy={y} r="3" fill={color} stroke="var(--color-surface)" strokeWidth="1.5" />
  })

  const labels = points.map((a, i) => {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2
    const lx = center + Math.cos(angle) * (radius + 22)
    const ly = center + Math.sin(angle) * (radius + 22)
    const cos = Math.cos(angle)
    const anchor = Math.abs(cos) < 0.25 ? "middle" : cos > 0 ? "start" : "end"
    const truncated = a.label.length > 16 ? `${a.label.slice(0, 15)}…` : a.label
    return (
      <text
        key={`${a.label}-label-${i}`}
        x={lx}
        y={ly}
        textAnchor={anchor}
        dominantBaseline="middle"
        className="fill-ink-muted"
        style={{ fontSize: 10.5, fontWeight: 500 }}
      >
        {truncated}
      </text>
    )
  })

  return (
    <svg
      width="100%"
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Skill breakdown by interview category: ${points
        .map((p) => `${p.label} ${Number(p.value).toFixed(1)} out of ${max}`)
        .join(", ")}`}
    >
      {levels.map((ratio) => (
        <polygon
          key={ratio}
          points={ringPoints(ratio)}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={ratio === 1 ? 1.25 : 1}
        />
      ))}
      {spokeLines}
      <polygon points={valuePoints} fill={color} fillOpacity="0.18" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {vertexDots}
      {labels}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Weekly activity bar chart                                            */
/* ------------------------------------------------------------------ */

export function WeeklyBars({ data = [], color = BRAND, unit = "interview" }) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div>
      <div className="flex h-40 items-end justify-between gap-2" role="img" aria-label={`Weekly activity by day. ${data
        .map((d) => `${d.label}: ${d.value} ${d.value === 1 ? unit : `${unit}s`}`)
        .join(", ")}`}>
        {data.map((d) => {
          const heightPercent = (d.value / max) * 100
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end justify-center">
                <div
                  className="w-full max-w-9 rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${Math.max(heightPercent, d.value > 0 ? 6 : 2)}%`,
                    backgroundColor: d.value > 0 ? color : "var(--color-line)",
                  }}
                  title={`${d.label}: ${d.value}`}
                />
              </div>
              <span className="text-[11px] font-medium text-ink-muted">{d.label}</span>
            </div>
          )
        })}
      </div>

<ul className="sr-only">
        {data.map((d) => (
          <li key={`sr-${d.label}`}>
            {d.label}: {d.value}
          </li>
        ))}
      </ul>
    </div>
  )
}

export { BRAND, EMERALD }
