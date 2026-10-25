// Fire-and-forget success messages: toast('Saved Oct 2026'). <Toaster /> shows them.
export function toast(message, tone = 'success') {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, tone, id: Date.now() + Math.random() } }))
}
