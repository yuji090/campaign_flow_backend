import { useNavigate } from 'react-router-dom'
import { clearSession, getUser, isAdmin } from '../../lib/auth'

const GROUPS = [
  {
    title: 'WORKSPACE',
    items: [
      { id: 'dashboard', icon: '▦', label: 'Overview', path: '/dashboard' },
      { id: 'campaigns', icon: '◫', label: 'Campaigns', path: '/campaigns' },
      { id: 'partners', icon: '◎', label: 'Partners', path: '/partners' },
    ],
  },
  {
    title: 'MONEY',
    items: [
      { id: 'finance', icon: '◆', label: 'Finance', path: '/finance' },
      { id: 'payments', icon: '⇄', label: 'Payments', path: '/payments' },
      { id: 'periods', icon: '▣', label: 'Month close', path: '/periods' },
    ],
  },
  {
    title: 'ADMIN',
    adminOnly: true,
    items: [{ id: 'users', icon: '◇', label: 'Users', path: '/users' }],
  },
]

// open / onClose only matter on small screens, where the sidebar slides in over the page
export default function Sidebar({ view, open, onClose }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  const go = (path) => {
    navigate(path)
    onClose?.()
  }

  const user = getUser()

  const name = user?.name || user?.email || 'User'
  const role = user?.role || ''

  return (
    <>
      {/* Dim the page behind the open drawer on small screens */}
      {open && <div className="fixed inset-0 z-40 bg-[rgba(16,24,40,.45)] lg:hidden" onClick={onClose} />}

      <aside
        className={`w-[248px] h-screen fixed lg:sticky top-0 z-50 bg-[#182d52] text-[#d8e3fb] p-[24px_14px_16px] flex flex-col justify-between shrink-0 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="min-h-0 overflow-y-auto">
          {/* Brand */}
          <button type="button" onClick={() => go('/dashboard')} className="flex items-center gap-2 px-[10px] border-0 bg-transparent cursor-pointer">
            <div className="w-[30px] h-[30px] rounded-[9px] bg-[#3563e9] grid place-items-center overflow-hidden">
              <img src="/the-digital-sole-logo.png" alt="" className="w-full h-full object-contain" />
            </div>
            <div className="text-white font-extrabold text-xl">
              Campaign<span className="text-[#9db9ff]">Flow</span>
            </div>
          </button>

          {GROUPS.filter((group) => !group.adminOnly || isAdmin()).map((group) => (
            <div key={group.title}>
              <div className="text-[#7f96c6] text-[10px] tracking-[1.1px] font-extrabold pt-[26px] px-[12px] pb-[8px]">
                {group.title}
              </div>

              <nav className="grid grid-cols-1 gap-[2px]">
                {group.items.map((item) => {
                  const active = view === item.id

                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => go(item.path)}
                      aria-current={active ? 'page' : undefined}
                      className={`border-0 rounded-lg cursor-pointer px-3 py-[10px] text-left font-semibold text-[13px] flex items-center gap-3 transition ${
                        active
                          ? 'bg-[rgba(148,181,255,.16)] text-white shadow-[inset_3px_0_#7ca4ff]'
                          : 'bg-transparent text-[#c9d6f0] hover:bg-[rgba(148,181,255,.08)] hover:text-white'
                      }`}
                    >
                      <span className={`w-4 text-center ${active ? 'text-[#9db9ff]' : 'text-[#7f96c6]'}`}>{item.icon}</span>
                      {item.label}
                    </button>
                  )
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* User */}
        <div className="flex items-center gap-[9px] border-t border-[rgba(215,230,255,.16)] pt-[15px] px-[7px]">
          <div className="w-[32px] h-[32px] rounded-full bg-[#5475d7] text-white grid place-items-center font-extrabold shrink-0">
            {name[0]?.toUpperCase()}
          </div>

          <div className="overflow-hidden flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-[#f4f7ff] truncate">{name}</div>
            <div className="text-[10px] text-[#99abd0] mt-[2px] capitalize">{role.toLowerCase()}</div>
          </div>

          <button
            type="button"
            title="Sign out"
            onClick={handleLogout}
            className="border-0 bg-transparent text-[#aec0df] cursor-pointer text-[12px] font-bold px-2 py-1 rounded-md hover:text-white hover:bg-[rgba(148,181,255,.12)] transition"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
