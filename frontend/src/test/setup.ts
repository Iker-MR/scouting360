import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { HttpNetworkFrame } from 'msw/experimental'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'
import { createUnhandledRequestTracker } from './unhandledRequests'

const unhandledRequests = createUnhandledRequestTracker()

beforeAll(() =>
  server.listen({
    onUnhandledFrame({ frame, defaults }) {
      if (frame instanceof HttpNetworkFrame) {
        const { method, url } = frame.data.request
        unhandledRequests.record(`${method} ${new URL(url).pathname}`)
      }
      defaults.error()
    },
  }),
)
afterEach(() => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  sessionStorage.clear()
  unhandledRequests.assertNone()
})
afterAll(() => server.close())
