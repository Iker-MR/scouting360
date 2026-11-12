import { http, HttpResponse } from 'msw'
import { server } from './server'

// Regression for a flaky suite: a request still looking for its handler when a
// test ended was matched after resetHandlers(), reported as unhandled, and the
// global afterEach blamed the NEXT test. Both tests here must pass.
describe('Peticiones en vuelo al terminar un test', () => {
  it('una petición con handler lanzada al final del test no es un error', () => {
    server.use(http.get('/api/en-vuelo/', () => HttpResponse.json({ ok: true })))
    void fetch('/api/en-vuelo/').catch(() => null)
  })

  it('el test siguiente no hereda peticiones del anterior', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
})
