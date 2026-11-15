import { InterfaceIcon } from './InterfaceIcon'

export type NavPage = 'viewer' | 'play' | 'learn'

interface Props {
  active: NavPage
  /** Carried between pages so the game uses the same charts as the viewer. */
  setupParams: URLSearchParams
}

const PAGES: { id: NavPage; label: string; href: string }[] = [
  { id: 'viewer', label: 'Ranges', href: '/' },
  { id: 'play', label: 'Play', href: '/play' },
  { id: 'learn', label: 'Learn', href: '/learn' },
]

export function TopNav({ active, setupParams }: Props) {
  const query = setupParams.toString()
  return (
    <header className="app-header">
      <div className="app-brand">
        <span className="app-brand__mark" aria-hidden="true">
          ♠
        </span>
        <span>Poker Practice</span>
      </div>
      <nav className="topbar" aria-label="Pages">
        {PAGES.map((page) => (
          <a
            key={page.id}
            href={query ? `${page.href}?${query}` : page.href}
            className={`topbar__link${page.id === active ? ' topbar__link--active' : ''}`}
            aria-current={page.id === active ? 'page' : undefined}
          >
            <InterfaceIcon name={page.id === 'play' ? 'play' : 'ranges'} />
            <span>{page.label}</span>
          </a>
        ))}
      </nav>
    </header>
  )
}
