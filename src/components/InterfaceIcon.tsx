/** Decorative interface artwork only; never selects or grades an action. */
export function InterfaceIcon({ name }: { name: string }) {
  let artwork
  switch (name) {
    case 'learn':
      artwork = (
        <>
          <path d="M12 6v16M12 6C8 3 4 3 2 4v15c4-1 7 0 10 3 3-3 6-4 10-3V4c-2-1-6-1-10 2Z" />
        </>
      )
      break
    case 'settings':
      artwork = (
        <>
          <path d="M3 6h18M3 13h18M3 20h18" />
          <circle cx="8" cy="6" r="2.5" fill="var(--card)" />
          <circle cx="16" cy="13" r="2.5" fill="var(--card)" />
          <circle cx="8" cy="20" r="2.5" fill="var(--card)" />
        </>
      )
      break
    case 'review':
      artwork = (
        <>
          <path d="M20 9a8 8 0 1 0 0 8M20 3v6h-6" />
        </>
      )
      break
    case 'arrow':
      artwork = <path d="m9 5 7 8-7 8" />
      break
    case 'close':
      artwork = <path d="m6 7 12 12M18 7 6 19" />
      break
    case 'play':
      artwork = <path d="m8 4 12 8-12 8V4Z" />
      break
    case 'ranges':
      artwork = (
        <>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M4 10h16M4 15h16M10 4v16M15 4v16" />
        </>
      )
      break
    case 'fold':
    case 'F':
      artwork = (
        <>
          <path d="M6 21V4m0 1c4-4 8 4 13 0v10c-5 4-9-4-13 0" />
        </>
      )
      break
    case 'check':
    case 'X':
      artwork = (
        <>
          <path d="M8 13V6a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v7c0 4-2 6-6 6h-2c-2 0-3-1-4-2l-4-5a1.5 1.5 0 0 1 2-2l3 3" />
        </>
      )
      break
    case 'raise':
    case 'R':
    case 'AI':
      artwork = (
        <>
          <path d="M12 21V4m-7 7 7-7 7 7M5 18v-4m14 4v-4" />
        </>
      )
      break
    default:
      artwork = (
        <>
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v5c0 4 16 4 16 0V5M4 10v5c0 4 16 4 16 0v-5M4 15v4c0 4 16 4 16 0v-4" />
        </>
      )
  }
  return (
    <svg
      className="interface-icon"
      viewBox="0 0 24 26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {artwork}
    </svg>
  )
}
