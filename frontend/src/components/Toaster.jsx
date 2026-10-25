import { useEffect, useState } from 'react'

const TONES = {
  success: 'bg-[#101828] text-white',
  error: 'bg-[#b42318] text-white',
}

// Bottom-right stack of short messages sent with toast() from lib/toast
export default function Toaster() {
  const [items, setItems] = useState([])

  useEffect(() => {
    const onToast = (event) => {
      const item = event.detail
      setItems((old) => [...old.slice(-2), item])
      setTimeout(() => setItems((old) => old.filter((i) => i.id !== item.id)), 3200)
    }

    window.addEventListener('app-toast', onToast)
    return () => window.removeEventListener('app-toast', onToast)
  }, [])

  return (
    <div className="fixed bottom-5 right-5 z-[60] grid gap-2 pointer-events-none" role="status" aria-live="polite">
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto rounded-[10px] px-4 py-3 text-[13px] font-semibold shadow-[0_12px_32px_rgba(16,24,40,.24)] flex items-center gap-2 animate-[toast-in_.18s_ease-out] ${TONES[item.tone] || TONES.success}`}
        >
          <span aria-hidden>{item.tone === 'error' ? '⚠' : '✓'}</span>
          {item.message}
        </div>
      ))}
    </div>
  )
}
