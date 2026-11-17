import { InterfaceIcon } from './InterfaceIcon'
import { AppLogo } from './AppLogo'

export type NavPage = 'viewer' | 'play' | 'learn'

interface Props {
  active: NavPage
  /** Preserved for range/lesson navigation; live play has its own setup. */
  setupParams: URLSearchParams
}

const PAGES: { id: NavPage; label: string; href: string }[] = [
  { id: 'viewer', label: 'Ranges', href: '/ranges' },
  { id: 'play', label: 'Play', href: '/live' },
  { id: 'learn', label: 'Learn', href: '/learn' },
]

export function TopNav({ active, setupParams }: Props) {
  const query = setupParams.toString()
  return (
    <header className="app-header">
      <a className="app-brand app-home-link" href="/" aria-label="Home">
        <AppLogo className="app-logo--nav" />
        <span>
          Poker Trainer<small>by Greg</small>
        </span>
      </a>
      <nav className="topbar" aria-label="Pages">
        {PAGES.map((page) => (
          <a
            key={page.id}
            href={
              query && page.id !== 'play' ? `${page.href}?${query}` : page.href
            }
            className={`topbar__link${page.id === active ? ' topbar__link--active' : ''}`}
            aria-current={page.id === active ? 'page' : undefined}
          >
            <InterfaceIcon name={page.id === 'viewer' ? 'ranges' : page.id} />
            <span>{page.label}</span>
          </a>
        ))}
      </nav>
    </header>
  )
}
