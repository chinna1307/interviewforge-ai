const base = {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": "true",
  focusable: "false",
}

const make =
  (paths, viewBox = "0 0 24 24") =>
  ({ size = 20, className = "", strokeWidth, ...rest }) => {
    const extra = {}
    if (strokeWidth) extra.strokeWidth = strokeWidth
    return (
      <svg {...base} {...extra} viewBox={viewBox} className={className} style={{ width: size, height: size, flexShrink: 0 }} {...rest}>
        {paths}
      </svg>
    )
  }

export const IconDashboard = make(
  <>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </>,
)

export const IconResume = make(
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h4" />
  </>,
)

export const IconMic = make(
  <>
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5V21M8.5 21h7" />
  </>,
)

export const IconHistory = make(
  <>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3 4v4.5h4.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
)

export const IconUser = make(
  <>
    <circle cx="12" cy="8" r="3.75" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </>,
)

export const IconLogout = make(
  <>
    <path d="M14.5 4.5H18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3.5" />
    <path d="M10 8l-4 4 4 4" />
    <path d="M6 12h9" />
  </>,
)

export const IconMenu = make(
  <>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </>,
)

export const IconClose = make(
  <>
    <path d="M6 6l12 12M18 6L6 18" />
  </>,
)

export const IconBell = make(
  <>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9" />
    <path d="M10.3 19a2 2 0 0 0 3.4 0" />
  </>,
)

export const IconArrowRight = make(
  <>
    <path d="M5 12h13" />
    <path d="M13 6.5l6 5.5-6 5.5" />
  </>,
)

export const IconArrowLeft = make(
  <>
    <path d="M19 12H6" />
    <path d="M11 6.5L5 12l6 5.5" />
  </>,
)

export const IconUpload = make(
  <>
    <path d="M12 16V4.5" />
    <path d="M7.5 9L12 4.5 16.5 9" />
    <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
  </>,
)

export const IconCheck = make(
  <>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </>,
)

export const IconAlert = make(
  <>
    <path d="M12 4.5L21 19.5H3z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </>,
)

export const IconTarget = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </>,
)

export const IconLayers = make(
  <>
    <path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z" />
    <path d="M3.5 12.5L12 17l8.5-4.5" />
    <path d="M3.5 16.5L12 21l8.5-4.5" />
  </>,
)

export const IconBolt = make(
  <>
    <path d="M13.5 2.5L5 13.5h6l-.5 8L19 10.5h-6z" />
  </>,
)

export const IconTrash = make(
  <>
    <path d="M4 7h16" />
    <path d="M9.5 7V5h5v2" />
    <path d="M6.5 7l.8 12.1A1.9 1.9 0 0 0 9.2 21h5.6a1.9 1.9 0 0 0 1.9-1.9L17.5 7" />
  </>,
)

export const IconRefresh = make(
  <>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20.5 4v4.5H16" />
  </>,
)

export const IconSun = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
  </>,
)

export const IconMoon = make(
  <>
    <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2" />
  </>,
)

export const IconChart = make(
  <>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </>,
)

export const IconChat = make(
  <>
    <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.4-4.3A8 8 0 1 1 21 12" />
  </>,
)

export const IconBulb = make(
  <>
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3" />
  </>,
)

export const IconFlame = make(
  <>
    <path d="M12 21a6 6 0 0 0 6-6c0-4-3-5.5-3.5-9-2 1.5-2.5 3.5-2.5 5 0 1-.8 2-2 2s-2-1-2-3c-1 1.5-2 3.5-2 5a6 6 0 0 0 6 6" />
  </>,
)

export const IconInbox = make(
  <>
    <path d="M3.5 13h4l1.5 3h6l1.5-3h4" />
    <path d="M5.3 5.5h13.4l2.3 7.5v5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-5z" />
  </>,
)

export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </>,
)
