import { parseRangeEntries } from '@/lib/rangeEntries'

/** A fresh, bounded request per attempt so an empty/stalled response can be
 * retried without poisoning the shared chart viewer's in-memory cache.
 * The existing offline worker serves this same bundled file when installed. */
export async function loadLiveCharts() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch('/ranges/Cash_100_PTO.json', {
      signal: controller.signal,
    })
    if (!response.ok)
      throw Error(`Grading charts could not load (${response.status}).`)
    const entries = parseRangeEntries(await response.text())
    if (!entries.length) throw Error('Grading charts are empty.')
    return entries
  } finally {
    clearTimeout(timeout)
  }
}
