import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { isAdmin } from '../lib/auth'

const PAGES = [
  { label: 'Overview', hint: 'Page', to: '/dashboard' },
  { label: 'Monthly entry', hint: 'Fill in a month', to: '/monthly' },
  { label: 'Finance', hint: 'Page', to: '/finance' },
  { label: 'Payments', hint: 'Page', to: '/payments' },
  { label: 'Month close', hint: 'Page', to: '/periods' },
  { label: 'Campaigns', hint: 'Page', to: '/campaigns' },
  { label: 'Partners', hint: 'Page', to: '/partners' },
]

const ACTIONS = [
  { label: 'New campaign', hint: 'Action', to: '/campaigns/new' },
  { label: 'Record a payment', hint: 'Action', to: '/payments?new=1' },
]

/**
 * Ctrl/⌘ + K: type to jump to any campaign, partner, distribution or page.
 * Also opened by the "app-search" event (the search button in the sidebar).
 */
export default function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [records, setRecords] = useState(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    // Opening always starts with an empty search
    const show = () => {
      setQuery('')
      setActive(0)
      setOpen(true)
    }

    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((value) => {
          if (!value) {
            setQuery('')
            setActive(0)
          }
          return !value
        })
      }
    }
    const onOpen = show

    window.addEventListener('keydown', onKey)
    window.addEventListener('app-search', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('app-search', onOpen)
    }
  }, [])

  // Load the searchable records each time it opens, so new items show up
  useEffect(() => {
    if (!open) return

    Promise.all([api.get('/api/campaigns'), api.get('/api/partners'), api.get('/api/distributions')])
      .then(([campaigns, partners, distributions]) => setRecords({ campaigns, partners, distributions }))
      .catch(() => setRecords({ campaigns: [], partners: [], distributions: [] }))
  }, [open])

  const items = useMemo(() => {
    const all = [
      ...ACTIONS,
      ...PAGES,
      ...(isAdmin() ? [{ label: 'Users', hint: 'Page', to: '/users' }] : []),
      ...(records?.campaigns || []).map((c) => ({
        label: c.name,
        hint: `Campaign · ${c.direct ? 'Direct' : c.advertiserName} · ${c.status}`,
        to: `/campaigns/${c.id}`,
      })),
      ...(records?.partners || []).map((p) => ({
        label: p.companyName,
        hint: `Partner · ${[p.advertiser && 'Advertiser', p.publisher && 'Publisher'].filter(Boolean).join(' & ')}${p.active ? '' : ' · inactive'}`,
        to: `/partners/${p.id}`,
      })),
      ...(records?.distributions || []).map((d) => ({
        label: `${d.publisherName} → ${d.campaignName}`,
        hint: `Distribution${d.label ? ` · ${d.label}` : ''} · ${d.status}`,
        to: `/distributions/${d.id}`,
      })),
    ]

    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length === 0) return all.slice(0, 9)

    return all
      .filter((item) => {
        const text = `${item.label} ${item.hint}`.toLowerCase()
        return words.every((word) => text.includes(word))
      })
      .slice(0, 30)
  }, [records, query])

  // Keep the highlighted row in view
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const go = (item) => {
    setOpen(false)
    navigate(item.to)
  }

  const onKeyDown = (event) => {
    if (event.key === 'Escape') setOpen(false)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, items.length - 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    }
    if (event.key === 'Enter' && items[active]) go(items[active])
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-[rgba(16,24,40,.45)] grid justify-items-center items-start pt-[12vh] px-4"
      onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
    >
      <div className="w-full max-w-[600px] bg-white rounded-[14px] shadow-[0_24px_64px_rgba(16,24,40,.3)] overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-[#eef1f5]">
          <span className="text-[#98a2b3] text-[16px]" aria-hidden>⌕</span>
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Search campaigns, partners, publishers, pages…"
            className="flex-1 h-[54px] border-0 outline-none text-[15px] bg-transparent"
          />
          <kbd className="text-[10px] text-[#98a2b3] border border-[#e6eaf0] rounded px-[6px] py-[2px]">Esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="text-center text-[13px] text-[#667085] py-8">No match for “{query}”</div>
          ) : items.map((item, index) => (
            <button
              key={`${item.to}-${index}`}
              type="button"
              data-index={index}
              onMouseEnter={() => setActive(index)}
              onClick={() => go(item)}
              className={`w-full flex items-center justify-between gap-3 text-left border-0 cursor-pointer rounded-[9px] px-3 py-[10px] ${
                index === active ? 'bg-[#f0f4ff]' : 'bg-transparent'
              }`}
            >
              <span className="min-w-0">
                <span className={`block text-[13px] font-semibold truncate ${index === active ? 'text-[#3563e9]' : 'text-[#172033]'}`}>
                  {item.label}
                </span>
                <span className="block text-[11px] text-[#98a2b3] truncate">{item.hint}</span>
              </span>
              {index === active && <span className="text-[11px] text-[#3563e9] font-bold shrink-0">↵ Open</span>}
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-[#eef1f5] text-[11px] text-[#98a2b3] flex gap-4">
          <span>↑↓ to move</span>
          <span>↵ to open</span>
          <span className="ml-auto">Ctrl / ⌘ K anywhere</span>
        </div>
      </div>
    </div>
  )
}
