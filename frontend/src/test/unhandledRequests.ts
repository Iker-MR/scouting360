/**
 * Collects requests that no MSW handler matched so the test that made them
 * can be failed afterwards. MSW only aborts unhandled requests, and the app
 * may swallow that network error, so the test would otherwise pass.
 */
export function createUnhandledRequestTracker() {
  let unhandled: string[] = []

  return {
    record(description: string) {
      unhandled.push(description)
    },
    assertNone() {
      const found = unhandled
      // Reset before throwing so one test's leak does not fail the next ones.
      unhandled = []
      if (found.length > 0) {
        throw new Error(`Requests without an MSW handler:\n${found.join('\n')}`)
      }
    },
  }
}
