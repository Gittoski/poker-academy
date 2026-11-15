import { expect, it } from 'vitest'
import { runInNewContext } from 'node:vm'
import { createHash, webcrypto } from 'node:crypto'
import { WORKER } from './worker'
async function worker(tampered: boolean) {
  const messages: { type: string; ready?: boolean }[] = [],
    handlers: Record<string, (e: unknown) => void> = {}
  const entries = new Map<string, Map<string, Response>>()
  entries.set(
    'poker-offline-meta-v1',
    new Map([
      [
        '/__poker_offline_active__',
        Response.json({ name: 'poker-offline-pack-old', urls: ['/old'] }),
      ],
    ]),
  )
  entries.set(
    'poker-offline-pack-old',
    new Map([['/old', new Response('old')]]),
  )
  const caches = {
    has: async (n: string) => entries.has(n),
    keys: async () => [...entries.keys()],
    delete: async (n: string) => entries.delete(n),
    open: async (n: string) => {
      if (!entries.has(n)) entries.set(n, new Map())
      const store = entries.get(n)!
      return {
        match: async (k: string) => store.get(k)?.clone(),
        put: async (k: string, v: Response) => {
          store.set(k, v.clone())
        },
      }
    },
  }
  const expected = JSON.stringify({ valid: true }),
    hash = createHash('sha256').update(expected).digest('hex')
  const fetch = async (u: string) =>
    u === '/offline-assets.json'
      ? Response.json({
          version: 'test',
          urls: ['/', '/play', '/learn', '/fixture.json'],
          integrity: { '/fixture.json': hash },
        })
      : u === '/fixture.json'
        ? new Response(tampered ? '{}' : expected, {
            headers: { 'content-type': 'application/json' },
          })
        : new Response('<html></html>', {
            headers: { 'content-type': 'text/html' },
          })
  runInNewContext(WORKER, {
    caches,
    fetch,
    Response,
    URL,
    crypto: webcrypto,
    self: {
      location: { origin: 'https://example.test' },
      registration: { unregister: async () => true },
      clients: { matchAll: async () => [], claim: async () => {} },
      addEventListener: (name: string, callback: (e: unknown) => void) => {
        handlers[name] = callback
      },
    },
  })
  let pending: Promise<unknown> = Promise.resolve()
  const send = (type: string) => {
    handlers.message({
      data: { type },
      source: {
        postMessage: (v: { type: string; ready?: boolean }) => messages.push(v),
      },
      waitUntil: (p: Promise<unknown>) => {
        pending = p
      },
    })
    return pending
  }
  await send('DOWNLOAD')
  return { messages, entries, send }
}
it('rejects corrupt/incomplete downloads without replacing the previous offline pack', async () => {
  const { messages, entries } = await worker(true)
  expect(messages.some((m) => m.type === 'READY')).toBe(false)
  expect(messages.at(-1)?.type).toBe('ERROR')
  expect(entries.has('poker-offline-pack-old')).toBe(true)
  expect(entries.size).toBe(2)
})
it('commits a complete checked pack and validates it before reporting availability', async () => {
  const { messages, entries, send } = await worker(false)
  expect(messages.at(-1)?.type).toBe('READY')
  expect(entries.has('poker-offline-pack-old')).toBe(false)
  await send('STATUS')
  expect(messages.at(-1)).toEqual({ type: 'STATUS', ready: true })
  await send('REMOVE')
  expect(entries.size).toBe(0)
})
