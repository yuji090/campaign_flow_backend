import { useNavigate } from 'react-router-dom'
import { clearSession, getUser, isAdmin } from '../../lib/auth'

export default function Sidebar({ view }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  const menuItems = [
    { id: 'dashboard', icon: '▦', label: 'Overview', path: '/dashboard' },
    { id: 'finance', icon: '◆', label: 'Finance', path: '/finance' },
    { id: 'campaigns', icon: '◫', label: 'Campaigns', path: '/campaigns' },
    { id: 'partners', icon: '◎', label: 'Partners', path: '/partners' },
    ...(isAdmin()
      ? [{ id: 'users', icon: '◇', label: 'Users', path: '/users' }]
      : []),
  ]

  const user = getUser()

  const name = user?.name || user?.email || 'User'
  const role = user?.role || ''

  return (
    <aside className="w-[250px] min-h-screen sticky top-0 self-start bg-[#182d52] text-[#d8e3fb] p-[28px_16px_18px] flex flex-col justify-between shrink-0">

      {/* Brand */}
      <div>
        <div className="flex items-center gap-2 px-[9px]">
          <div className="w-[30px] h-[30px] rounded-[9px] bg-[#3563e9] grid place-items-center overflow-hidden">
            <img
              src="/the-digital-sole-logo.png"
              alt="The Digital Sole"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="text-white font-extrabold text-xl">
            Campaign<span className="text-[#9db9ff]">Flow</span>
          </div>
        </div>

        {/* Workspace */}
        <div className="text-[#91a7d4] text-[10px] tracking-[1.1px] font-extrabold pt-[38px] px-[10px] pb-[10px]">
          WORKSPACE
        </div>

        {/* Navigation */}
        <nav className="grid gap-1">
          {menuItems.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`
                border-0
                rounded-lg
                bg-transparent
                text-[#c9d6f0]
                cursor-pointer
                p-[11px_12px]
                text-left
                font-semibold
                text-[13px]
                flex
                items-center
                gap-3
                transition
                ${
                  view === item.id
                    ? 'bg-[rgba(148,181,255,.16)] text-white shadow-[inset_3px_0_#7ca4ff]'
                    : 'hover:bg-[rgba(148,181,255,.08)]'
                }
              `}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* User */}
      <div className="flex items-center gap-[9px] border-t border-[rgba(215,230,255,.16)] pt-[17px] px-[7px]">

        <div className="w-[31px] h-[31px] rounded-full bg-[#5475d7] text-white grid place-items-center font-extrabold shrink-0">
          {name[0]?.toUpperCase()}
        </div>

        <div className="overflow-hidden flex-1 min-w-0">
          <div className="text-[11px] text-[#f4f7ff] whitespace-nowrap text-ellipsis overflow-hidden">
            {name}
          </div>

          <div className="text-[9px] text-[#99abd0] mt-[3px]">
            {role}
          </div>
        </div>

        <button
          type="button"
          title="Sign out"
          onClick={handleLogout}
          className="border-0 bg-transparent text-[#aec0df] cursor-pointer text-[19px] hover:text-white transition"
        >
          ↪
        </button>
      </div>
    </aside>
  )
}
