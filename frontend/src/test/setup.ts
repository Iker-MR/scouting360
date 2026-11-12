import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { createLookupTracker } from './lookupTracker'
import { server } from './server'
import { createUnhandledRequestTracker } from './unhandledRequests'

const unhandledRequests = createUnhandledRequestTracker()
const lookups = createLookupTracker()

beforeAll(() => {
  server.events.on('request:start', ({ requestId }) => lookups.start(requestId))
  server.events.on('request:match', ({ requestId }) => lookups.settle(requestId))
  server.events.on('request:unhandled', ({ request, requestId }) => {
    // Record before settling, so idle() never resolves ahead of the record.
    unhandledRequests.record(`${request.method} ${new URL(request.url).pathname}`)
    lookups.settle(requestId)
  })
  server.listen({
    onUnhandledFrame({ defaults }) {
      defaults.error()
    },
  })
})
afterEach(async () => {
  cleanup()
  // Let in-flight requests find their handler before the handlers are reset.
  await lookups.idle()
  server.resetHandlers()
  localStorage.clear()
  sessionStorage.clear()
  unhandledRequests.assertNone()
})
afterAll(() => {
  server.events.removeAllListeners()
  server.close()
})
