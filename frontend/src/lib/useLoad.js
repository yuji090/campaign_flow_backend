import { useCallback, useEffect, useRef, useState } from 'react'

// Runs an async loader on mount and whenever deps change.
// Keeps the previous data while reloading, so pages don't flash empty.
// reload() returns a promise that resolves once the fresh data is in.
export default function useLoad(loader, deps = []) {
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState({ key: null, data: null, error: '' })
  const waiters = useRef([])

  const key = `${JSON.stringify(deps)}:${version}`

  useEffect(() => {
    let cancelled = false

    Promise.resolve()
      .then(() => loader())
      .then(
        (data) => !cancelled && setResult({ key, data, error: '' }),
        (err) => !cancelled && setResult((old) => ({
          key,
          data: old.data,
          error: err.message || 'Failed to load data',
        }))
      )
      .finally(() => {
        if (cancelled) return
        const pending = waiters.current
        waiters.current = []
        pending.forEach((resolve) => resolve())
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const reload = useCallback(
    () => new Promise((resolve) => {
      waiters.current.push(resolve)
      setVersion((v) => v + 1)
    }),
    []
  )

  return {
    data: result.data,
    loading: result.key !== key,
    error: result.key === key ? result.error : '',
    reload,
  }
}
