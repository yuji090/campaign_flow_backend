import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Toaster from '../Toaster'
import CommandPalette from '../CommandPalette'

// Sidebar item to highlight for each section; each page renders its own PageHeader
const sections = [
  { prefix: '/campaigns', view: 'campaigns' },
  { prefix: '/distributions', view: 'campaigns' },
  { prefix: '/monthly', view: 'monthly' },
  { prefix: '/finance', view: 'finance' },
  { prefix: '/payments', view: 'payments' },
  { prefix: '/periods', view: 'periods' },
  { prefix: '/partners', view: 'partners' },
  { prefix: '/users', view: 'users' },
]

export default function AppLayout() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const view = sections.find((section) => location.pathname.startsWith(section.prefix))?.view || 'dashboard'

  return (
    <div className="min-h-screen flex bg-[#f6f8fb] text-[#172033] font-sans">
      <Sidebar view={view} open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex-1 min-w-0">
        {/* Top bar on small screens only */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-[52px] px-4 bg-[#182d52] text-white">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="border-0 bg-transparent text-white text-[20px] cursor-pointer leading-none"
          >
            ☰
          </button>
          <div className="font-extrabold">Campaign<span className="text-[#9db9ff]">Flow</span></div>
          <button
            type="button"
            aria-label="Search"
            onClick={() => window.dispatchEvent(new Event('app-search'))}
            className="ml-auto border-0 bg-transparent text-white text-[18px] cursor-pointer"
          >
            ⌕
          </button>
        </div>

        <main className="w-full max-w-[1440px] px-4 sm:px-6 lg:px-[38px] pb-[56px] mx-auto">
          <Outlet />
        </main>
      </div>

      <Toaster />
      <CommandPalette />
    </div>
  )
}
