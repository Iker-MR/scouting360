import { createLookupTracker } from './lookupTracker'

// Lets pending promise callbacks run before asserting.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('Búsquedas de handler pendientes', () => {
  it('idle se resuelve enseguida si no hay búsquedas pendientes', async () => {
    const tracker = createLookupTracker()
    let idle = false

    void tracker.idle().then(() => {
      idle = true
    })
    await flush()

    expect(idle).toBe(true)
  })

  it('idle espera a que todas las búsquedas pendientes terminen', async () => {
    const tracker = createLookupTracker()
    tracker.start('a')
    tracker.start('b')
    let idle = false

    void tracker.idle().then(() => {
      idle = true
    })
    tracker.settle('a')
    await flush()
    expect(idle).toBe(false)

    tracker.settle('b')
    await flush()
    expect(idle).toBe(true)
  })

  it('idle se resuelve tras el tope aunque una búsqueda no termine nunca', async () => {
    const tracker = createLookupTracker({ timeoutMs: 20 })
    tracker.start('colgada')

    // Fails by the test timeout if idle() never settles.
    await expect(tracker.idle()).resolves.toBeUndefined()
  })
})
