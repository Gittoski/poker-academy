import { newId } from './identity'
const MESSAGE =
  'Another tab is playing. Close that tab, then reload to resume safely.'
/** A per-document lock plus a reload-stable lease identity. The lease still fences every database transaction. */
export async function claimTab(): Promise<{
  owner: string
  exclusive: boolean
  release: () => void
}> {
  let owner = sessionStorage.getItem('poker-learning-tab')
  if (!owner) {
    owner = newId('tab')
    sessionStorage.setItem('poker-learning-tab', owner)
  }
  if (navigator.locks) {
    const abort = new AbortController()
    let release = () => {}
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        abort.abort()
        reject(Error(MESSAGE))
      }, 500)
      navigator.locks
        .request(
          'poker-learning-writer',
          { signal: abort.signal },
          async () => {
            clearTimeout(timer)
            resolve()
            await new Promise<void>((finish) => {
              release = finish
            })
          },
        )
        .catch(() => {
          clearTimeout(timer)
          reject(Error(MESSAGE))
        })
    })
    return { owner, exclusive: true, release }
  }
  // LAN HTTP may lack Web Locks. Detect copied sessionStorage in duplicate tabs without relying on a secure context.
  if (typeof BroadcastChannel === 'undefined')
    throw Error(
      'This browser cannot safely coordinate multiple simulator tabs. Use a current browser or a secure connection.',
    )
  const channel = new BroadcastChannel('poker-learning-tab-owner'),
    id = newId('document'),
    peers = new Set<string>()
  let active = false,
    conflict = false
  channel.onmessage = ({ data }) => {
    if (data?.owner !== owner || data.id === id) return
    if (data.type === 'probe') {
      channel.postMessage({ owner, id, type: active ? 'active' : 'contender' })
      if (!active) peers.add(data.id)
    }
    if (data.type === 'active') conflict = true
    if (data.type === 'contender') peers.add(data.id)
  }
  channel.postMessage({ owner, id, type: 'probe' })
  await new Promise((resolve) => setTimeout(resolve, 150))
  if (conflict || [...peers].some((peer) => peer < id)) {
    channel.close()
    throw Error(MESSAGE)
  }
  active = true
  return { owner, exclusive: false, release: () => channel.close() }
}
