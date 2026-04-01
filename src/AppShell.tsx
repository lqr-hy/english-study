import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import './AppShell.scss'

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function AppShell() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const isHome = location.pathname === '/'
  const isLearn =
    location.pathname.startsWith('/learn') || location.pathname.startsWith('/vocab')
  const isMistakes = location.pathname === '/records/mistakes'
  const isFavorites = location.pathname === '/records/favorites'

  return (
    <>
      <Outlet />

      <nav className="global-records-nav" aria-label="records navigation">
        <button
          type="button"
          className={`global-nav-toggle${menuOpen ? ' active' : ''}`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-label="切换学习菜单"
        >
          <MenuIcon />
        </button>

        <div className={`global-records-nav-links${menuOpen ? ' open' : ''}`}>
          <Link
            to="/"
            className={isHome ? 'global-nav-link active' : 'global-nav-link'}
          >
            <HomeIcon />
            首页
          </Link>
          <Link
            to="/learn"
            className={isLearn ? 'global-nav-link active' : 'global-nav-link'}
          >
            <BookIcon />
            学习
          </Link>
          <Link
            to="/records/mistakes"
            className={isMistakes ? 'global-nav-link active' : 'global-nav-link'}
          >
            <ErrorIcon />
            错题本
          </Link>
          <Link
            to="/records/favorites"
            className={isFavorites ? 'global-nav-link active' : 'global-nav-link'}
          >
            <StarIcon />
            收藏
          </Link>
        </div>
      </nav>
    </>
  )
}

export default AppShell
