import { createUnhandledRequestTracker } from './unhandledRequests'

describe('Registro de peticiones sin mock', () => {
  it('no falla si no hubo peticiones sin mock', () => {
    const tracker = createUnhandledRequestTracker()

    expect(() => tracker.assertNone()).not.toThrow()
  })

  it('falla listando las peticiones sin mock', () => {
    const tracker = createUnhandledRequestTracker()
    tracker.record('GET /api/auth/me/')
    tracker.record('POST /api/auth/logout/')

    expect(() => tracker.assertNone()).toThrow(
      /GET \/api\/auth\/me\/[\s\S]*POST \/api\/auth\/logout\//,
    )
  })

  it('se vacía después de comprobar', () => {
    const tracker = createUnhandledRequestTracker()
    tracker.record('GET /api/auth/me/')
    expect(() => tracker.assertNone()).toThrow()

    expect(() => tracker.assertNone()).not.toThrow()
  })
})
