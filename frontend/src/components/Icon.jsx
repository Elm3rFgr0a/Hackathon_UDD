const STROKE = {
  pill: <><path d="M10.5 20.5a5 5 0 0 1-7-7l9-9a5 5 0 0 1 7 7z" /><path d="M8.5 8.5l7 7" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  cross: <path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  back: <path d="M15 5l-7 7 7 7" />,
  check: <path d="M4 12.5l5 5L20 6.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14.5a5 5 0 0 1 4.5 5" /></>,
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  chevron: <path d="M9 5l7 7-7 7" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  walk: <><circle cx="13" cy="4.5" r="2" /><path d="M9 21l2-6 3 2v4M11 15l1-5-3 2-2 3M12 10l4 2 2-1" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></>,
  cup: <><path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" /><path d="M17 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  bell: <><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  alert: <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.5" /></>,
  box: <><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>,
  heart: <path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z" />,
  swap: <path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />,
  pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  car: <><path d="M5.5 17.5H3v-4.5l2.2-5.3A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.2L21 13v4.5h-2.5M9.3 17.5h5.4M3 13h18" /><circle cx="7.4" cy="17.5" r="1.9" /><circle cx="16.6" cy="17.5" r="1.9" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  logout: <><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.5" /></>,
}

/** Ícono de línea; hereda el color del texto. */
export function Icon({ name, size = 24, stroke = 2, className, label }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      style={{ flexShrink: 0 }}
    >
      {STROKE[name]}
    </svg>
  )
}

const cut = { fill: 'var(--icon-cut, var(--sec))' }
const cutStroke = { stroke: 'var(--icon-cut, var(--sec))' }

const FILLED = {
  pill: (
    <g transform="rotate(-45 12 12)">
      <rect x="1.5" y="7" width="21" height="10" rx="5" fill="currentColor" />
      <path d="M12 7h5.5a5 5 0 0 1 0 10H12z" style={cut} opacity=".4" />
      <path d="M12 7v10" style={cutStroke} strokeWidth="1.4" />
    </g>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="5.2" fill="currentColor" />
      <path d="M12 2v2.6M12 19.4V22M2 12h2.6M19.4 12H22M4.9 4.9l1.9 1.9M17.2 17.2l1.9 1.9M4.9 19.1l1.9-1.9M17.2 6.8l1.9-1.9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  cross: <path d="M9.3 3.5h5.4v5.8h5.8v5.4h-5.8v5.8H9.3v-5.8H3.5V9.3h5.8z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="17" rx="3.5" fill="currentColor" />
      <path d="M3 10.5h18" style={cutStroke} strokeWidth="1.6" />
      <g style={cut}>
        <circle cx="8" cy="14.6" r="1.4" /><circle cx="12" cy="14.6" r="1.4" /><circle cx="16" cy="14.6" r="1.4" />
        <circle cx="8" cy="18.2" r="1.4" /><circle cx="12" cy="18.2" r="1.4" />
      </g>
      <rect x="7.2" y="2" width="2.6" height="5.2" rx="1.3" fill="currentColor" style={cutStroke} strokeWidth="1" />
      <rect x="14.2" y="2" width="2.6" height="5.2" rx="1.3" fill="currentColor" style={cutStroke} strokeWidth="1" />
    </>
  ),
  pin: (
    <>
      <path d="M12 22.5s-7.8-6.6-7.8-12.6a7.8 7.8 0 0 1 15.6 0c0 6-7.8 12.6-7.8 12.6z" fill="currentColor" />
      <circle cx="12" cy="9.9" r="3.1" style={cut} />
    </>
  ),
  bell: (
    <>
      <path d="M5.5 16.5v-5.2a6.5 6.5 0 0 1 13 0v5.2l2 2.2h-17z" fill="currentColor" />
      <path d="M9.6 20.3a2.6 2.6 0 0 0 4.8 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  heart: <path d="M12 21s-8.5-5.3-8.5-11.6A4.9 4.9 0 0 1 12 6.6a4.9 4.9 0 0 1 8.5 2.8C20.5 15.7 12 21 12 21z" fill="currentColor" />,
}

/**
 * Ícono relleno para los botones grandes del adulto mayor. Los recortes
 * internos toman `--icon-cut` (por defecto el color de la sección).
 */
export function FilledIcon({ name, size = 48, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={{ flexShrink: 0 }}>
      {FILLED[name]}
    </svg>
  )
}
