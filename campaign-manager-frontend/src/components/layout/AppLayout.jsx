import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

// Sidebar item to highlight for each section; each page renders its own PageHeader
const sections = [
  { prefix: '/campaigns', view: 'campaigns' },
  { prefix: '/distributions', view: 'campaigns' },
  { prefix: '/finance', view: 'finance' },
  { prefix: '/partners', view: 'partners' },
  { prefix: '/users', view: 'users' },
]

export default function AppLayout() {
  const location = useLocation()

  const view = sections.find((section) => location.pathname.startsWith(section.prefix))?.view || 'dashboard'

  return (
    <div className="min-h-screen flex bg-[#f6f8fb] text-[#172033] font-sans">
      <Sidebar view={view} />

      <main className="flex-1 min-w-0 w-full max-w-[1500px] px-[38px] pb-[44px] mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
