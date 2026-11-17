import { afterEach, expect, it, vi } from 'vitest'
import { loadLiveCharts } from './liveCharts'

const chart = [
  { id: 'test', scenario: 'open', hero: ['LJ'], range: { raise: 'AA' } },
]
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('loads and validates the same bundled preflop charts used by the range viewer', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(chart)))
  vi.stubGlobal('fetch', fetcher)
  expect((await loadLiveCharts())[0].id).toBe('test')
  expect(fetcher).toHaveBeenCalledWith('/ranges/Cash_100_PTO.json', {
    signal: expect.any(AbortSignal),
  })
})

for (const [id, response] of [
  ['http-failure', () => new Response('Unavailable', { status: 503 })],
  ['empty-failure', () => new Response('[]')],
  ['invalid-failure', () => new Response('<html>Offline</html>')],
] as const)
  it(`lets learners retry after ${id} instead of caching a failed reference`, async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(new Response(JSON.stringify(chart)))
    vi.stubGlobal('fetch', fetcher)
    await expect(loadLiveCharts()).rejects.toThrow()
    expect((await loadLiveCharts())[0].id).toBe('test')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

it('aborts stalled chart requests and allows a fresh retry', async () => {
  vi.useFakeTimers()
  const fetcher = vi
    .fn()
    .mockImplementationOnce(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(new Error('Timed out')),
          )
        }),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify(chart)))
  vi.stubGlobal('fetch', fetcher)
  const failure = expect(loadLiveCharts()).rejects.toThrow('Timed out')
  await vi.advanceTimersByTimeAsync(15000)
  await failure
  expect((await loadLiveCharts())[0].id).toBe('test')
})
