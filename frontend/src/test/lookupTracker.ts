/**
 * Tracks requests MSW is still matching against its handlers.
 *
 * MSW looks a handler up asynchronously. If a test ends while a lookup is in
 * flight, resetHandlers() removes the handler first, the request is reported
 * as unhandled after the checks already ran, and the next test gets blamed.
 * Awaiting idle() before resetting closes that window.
 *
 * Note: MSW emits request:match only after the resolver returns, so idle()
 * also waits for slow responses. A request a test holds and never releases
 * costs that test the full timeout.
 */
export function createLookupTracker({ timeoutMs = 1000 }: { timeoutMs?: number } = {}) {
  const pending = new Set<string>()
  let waiters: Array<() => void> = []

  function notifyIfIdle() {
    if (pending.size > 0) return
    const current = waiters
    waiters = []
    current.forEach((resolve) => resolve())
  }

  return {
    start(requestId: string) {
      pending.add(requestId)
    },
    settle(requestId: string) {
      pending.delete(requestId)
      notifyIfIdle()
    },
    /** Resolves once no lookup is pending, or after timeoutMs as a safety net. */
    async idle(): Promise<void> {
      // MSW emits request:start a few microtasks after fetch() is called.
      // Yielding one macrotask lets every request already sent register first.
      await new Promise((resolve) => setTimeout(resolve, 0))
      if (pending.size === 0) return
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          // A lookup that never settles must not stall every later test too.
          pending.clear()
          notifyIfIdle()
        }, timeoutMs)
        waiters.push(() => {
          clearTimeout(timer)
          resolve()
        })
      })
    },
  }
}
