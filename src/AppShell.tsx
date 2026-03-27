import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

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
          菜单
        </button>

        <div className={`global-records-nav-links${menuOpen ? ' open' : ''}`}>
          <Link
            to="/"
            className={isHome ? 'global-nav-link active' : 'global-nav-link'}
          >
            首页
          </Link>
          <Link
            to="/learn"
            className={isLearn ? 'global-nav-link active' : 'global-nav-link'}
          >
            学习
          </Link>
          <Link
            to="/records/mistakes"
            className={isMistakes ? 'global-nav-link active' : 'global-nav-link'}
          >
            错题本
          </Link>
          <Link
            to="/records/favorites"
            className={isFavorites ? 'global-nav-link active' : 'global-nav-link'}
          >
            收藏
          </Link>
        </div>
      </nav>
    </>
  )
}

export default AppShell
