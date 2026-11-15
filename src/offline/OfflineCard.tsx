'use client'
import { useEffect, useRef, useState } from 'react'
export function OfflineCard() {
  const [status, setStatus] = useState('Checking offline support…'),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [reloadRequired, setReloadRequired] = useState(false),
    registration = useRef<ServiceWorkerRegistration | null>(null)
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      setStatus(
        'Offline installation needs HTTPS or localhost. A LAN HTTP address cannot install a service worker.',
      )
      return
    }
    let stopped = false
    const message = (e: MessageEvent) => {
      if (!e.data || stopped) return
      const data = e.data
      if (data.type === 'REMOVED') {
        registration.current = null
        setReady(false)
        setReloadRequired(true)
        setStatus(
          'Downloaded pack removed. Learning and simulator progress are kept. Reload online to use the current server build.',
        )
        return
      }
      if (data.type === 'STATUS' || data.type === 'READY') {
        setReady(!!data.ready)
        setBusy(false)
        setStatus(
          data.ready
            ? 'Available offline on this browser: app, lessons, charts and supplied hands are downloaded.'
            : 'No complete offline pack yet. Download while connected.',
        )
      }
      if (data.type === 'PROGRESS')
        setStatus(`Downloading offline pack: ${data.done}/${data.total} files`)
      if (data.type === 'ERROR') {
        setBusy(false)
        setStatus(
          `Download failed; any previous complete pack is kept. ${data.message}`,
        )
      }
    }
    navigator.serviceWorker.addEventListener('message', message)
    void (async () => {
      try {
        const existing = await navigator.serviceWorker.getRegistration('/')
        const r =
          existing ??
          (await navigator.serviceWorker.register('/offline-worker.js', {
            scope: '/',
          }))
        await navigator.serviceWorker.ready
        if (stopped) return
        registration.current = r
        ;(r.active ?? navigator.serviceWorker.controller)?.postMessage({
          type: 'STATUS',
        })
      } catch (e) {
        if (!stopped)
          setStatus(
            `Offline setup unavailable: ${String(e)}. Online learning remains available.`,
          )
      }
    })()
    return () => {
      stopped = true
      navigator.serviceWorker.removeEventListener('message', message)
    }
  }, [])
  return (
    <section className="card fundamentals">
      <details>
        <summary>Use offline on this device</summary>
        <p role="status" data-testid="offline-status">
          {status}
        </p>
        <button
          className="btn"
          disabled={busy || !registration.current?.active}
          onClick={() => {
            setBusy(true)
            setStatus('Preparing offline download…')
            registration.current?.active?.postMessage({ type: 'DOWNLOAD' })
          }}
        >
          {ready ? 'Update offline pack' : 'Download offline pack'}
        </button>
        {ready && (
          <button
            className="btn"
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  'Remove the downloaded app/content pack? Your learning and simulator history are kept. Reload online afterwards.',
                )
              )
                registration.current?.active?.postMessage({ type: 'REMOVE' })
            }}
          >
            Remove downloaded pack
          </button>
        )}
        {reloadRequired && (
          <button className="btn" onClick={() => location.reload()}>
            Reload online
          </button>
        )}
        <p>
          Download once over HTTPS or localhost. Then you can practice without
          your computer or internet while this pack remains stored. In Safari
          use Share → Add to Home Screen. Browser storage can be removed; keep
          progress backups. Updates require leaving simulator tabs first.
        </p>
        <p>
          Actual iPhone/Safari installation still needs device verification.
          Development mode is not an offline release build.
        </p>
      </details>
    </section>
  )
}
