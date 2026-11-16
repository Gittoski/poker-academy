/** Decorative beside the app name; card suit symbols remain ordinary suits. */
export function AppLogo({ className = '' }: { className?: string }) {
  return (
    <img
      className={`app-logo ${className}`}
      src="/brand-mark"
      width={48}
      height={48}
      alt=""
      aria-hidden="true"
      decoding="async"
    />
  )
}
