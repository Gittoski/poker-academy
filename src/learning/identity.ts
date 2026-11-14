/** Canonical plain-JSON encoding, with no implicit nonfinite/unsupported values. */
export function canonicalJson(value: unknown): string {
  const seen = new Set<object>()
  function encode(v: unknown): string {
    if (v === null || typeof v === 'string' || typeof v === 'boolean')
      return JSON.stringify(v)
    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v)
    if (typeof v !== 'object' || !v) throw Error('Invalid JSON value')
    if (seen.has(v)) throw Error('Cyclic record')
    seen.add(v)
    let result: string
    if (Array.isArray(v)) result = '[' + v.map(encode).join(',') + ']'
    else {
      if (
        Object.getPrototypeOf(v) !== Object.prototype &&
        Object.getPrototypeOf(v) !== null
      )
        throw Error('Record must be plain JSON')
      result =
        '{' +
        Object.keys(v)
          .sort()
          .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
          .map(
            (k) =>
              JSON.stringify(k) +
              ':' +
              encode((v as Record<string, unknown>)[k]),
          )
          .join(',') +
        '}'
    }
    seen.delete(v)
    return result
  }
  return encode(value)
}
/** SHA-256 also works on non-secure LAN URLs, where WebCrypto.subtle is unavailable. */
export function sha256(text: string): string {
  const bytes = new TextEncoder().encode(text)
  const data = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64)
  data.set(bytes)
  data[bytes.length] = 128
  const view = new DataView(data.buffer)
  view.setUint32(data.length - 8, Math.floor(bytes.length / 0x20000000))
  view.setUint32(data.length - 4, (bytes.length * 8) >>> 0)
  const primes: number[] = []
  for (let n = 2; primes.length < 64; n++)
    if (!primes.some((p) => n % p === 0)) primes.push(n)
  const k = primes.map((p) => ((Math.cbrt(p) % 1) * 0x100000000) >>> 0)
  const h = primes
    .slice(0, 8)
    .map((p) => ((Math.sqrt(p) % 1) * 0x100000000) >>> 0)
  const r = (v: number, n: number) => (v >>> n) | (v << (32 - n))
  const w = new Uint32Array(64)
  for (let offset = 0; offset < data.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4)
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15],
        b = w[i - 2]
      w[i] =
        ((r(a, 7) ^ r(a, 18) ^ (a >>> 3)) +
          w[i - 16] +
          (r(b, 17) ^ r(b, 19) ^ (b >>> 10)) +
          w[i - 7]) >>>
        0
    }
    let [a, b, c, d, e, f, g, j] = h
    for (let i = 0; i < 64; i++) {
      const t1 =
        (j +
          (r(e, 6) ^ r(e, 11) ^ r(e, 25)) +
          ((e & f) ^ (~e & g)) +
          k[i] +
          w[i]) >>>
        0
      const t2 =
        ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0
      j = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }
    ;[a, b, c, d, e, f, g, j].forEach((v, i) => {
      h[i] = (h[i] + v) >>> 0
    })
  }
  return h.map((v) => v.toString(16).padStart(8, '0')).join('')
}
export function contentHash(value: unknown): string {
  return sha256(canonicalJson(value))
}
export function newId(prefix: string): string {
  const values = globalThis.crypto.getRandomValues(new Uint32Array(4))
  return (
    prefix +
    ':' +
    Array.from(values, (v) => v.toString(16).padStart(8, '0')).join('')
  )
}
