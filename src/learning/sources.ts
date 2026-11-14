import type { RangeEntry } from '@/data/types'
import type { HandScript } from '@/lib/fullHands'
import { parseRangeEntries } from '@/lib/rangeEntries'
import { isPosition } from '@/lib/positions'
import { canonicalJson, contentHash } from './identity'
import { validFrequencies } from './classification'
import type { SourceRecord } from './types'

export function validateScript(value: HandScript): void {
  if (
    !value ||
    !['srp', '3bp'].includes(value.kind) ||
    !isPosition(value.hero) ||
    !isPosition(value.villain) ||
    value.hero === value.villain ||
    !['ip', 'oop'].includes(value.heroPlayer) ||
    typeof value.spot !== 'string' ||
    !Array.isArray(value.heroCards) ||
    value.heroCards.length !== 2 ||
    !Array.isArray(value.villainCards) ||
    value.villainCards.length !== 2 ||
    !Array.isArray(value.board) ||
    value.board.length < 3 ||
    value.board.length > 5
  )
    throw Error('Invalid hand reference')
  const cards = [...value.heroCards, ...value.villainCards, ...value.board]
  if (
    cards.some(
      (c) => typeof c !== 'string' || !/^([AKQJT2-9])[shdc]$/.test(c),
    ) ||
    new Set(cards).size !== cards.length ||
    !Number.isFinite(value.pot) ||
    value.pot <= 0 ||
    !Number.isFinite(value.stack) ||
    value.stack < 0
  )
    throw Error('Invalid hand reference cards/amounts')
  if (
    !Array.isArray(value.streets) ||
    value.streets.length < 1 ||
    value.streets.length > 3
  )
    throw Error('Invalid reference streets')
  value.streets.forEach((street, i) => {
    if (
      street.street !== ['flop', 'turn', 'river'][i] ||
      !Number.isFinite(street.pot) ||
      street.pot <= 0 ||
      !Array.isArray(street.nodes) ||
      street.nodes.length < 1 ||
      street.nodes.length > 100
    )
      throw Error('Invalid reference street')
    for (const n of street.nodes) {
      if (
        !['ip', 'oop'].includes(n.p) ||
        !Array.isArray(n.actions) ||
        n.actions.length < 1 ||
        n.actions.length > 12 ||
        !Number.isInteger(n.chosen) ||
        n.chosen < 0 ||
        n.chosen >= n.actions.length
      )
        throw Error('Invalid reference node')
      if (
        n.actions.some(
          (a) =>
            !a ||
            !['X', 'B', 'R', 'C', 'F', 'AI'].includes(a.a) ||
            (a.to !== undefined && (!Number.isFinite(a.to) || a.to < 0)) ||
            (a.bb !== undefined && (!Number.isFinite(a.bb) || a.bb < 0)),
        )
      )
        throw Error('Invalid reference action')
      if (
        n.probs !== undefined &&
        (n.probs.length !== n.actions.length ||
          !validFrequencies({ values: n.probs, scale: 100, applicable: true }))
      )
        throw Error('Invalid reference frequencies')
      if (
        n.grid !== undefined &&
        (typeof n.grid !== 'object' ||
          Object.values(n.grid).some(
            (v) =>
              !Array.isArray(v) ||
              v.length !== n.actions.length ||
              v.some((p) => !Number.isFinite(p) || p < 0 || p > 100),
          ))
      )
        throw Error('Invalid reference grid')
    }
  })
  if (
    !value.result ||
    !['fold', 'showdown'].includes(value.result.kind) ||
    !['hero', 'villain', 'split'].includes(value.result.winner) ||
    !Number.isFinite(value.result.pot) ||
    value.result.pot < 0
  )
    throw Error('Invalid reference result')
}
export function createSource(
  kind: 'ranges',
  logicalId: string,
  payload: RangeEntry[],
  now?: number,
): SourceRecord & { kind: 'ranges' }
export function createSource(
  kind: 'script',
  logicalId: string,
  payload: HandScript,
  now?: number,
): SourceRecord & { kind: 'script' }
export function createSource(
  kind: 'ranges' | 'script',
  logicalId: string,
  payload: RangeEntry[] | HandScript,
  now = Date.now(),
): SourceRecord {
  if (
    typeof logicalId !== 'string' ||
    !logicalId ||
    logicalId.length > 300 ||
    !Number.isFinite(now) ||
    now < 0
  )
    throw Error('Invalid reference identity')
  const encoded = canonicalJson(payload)
  const copy = JSON.parse(encoded)
  if (kind === 'ranges') {
    const entries = parseRangeEntries(encoded)
    if (
      !entries.length ||
      new Set(entries.map((e) => e.id)).size !== entries.length
    )
      throw Error('Missing or duplicate range identities')
  } else validateScript(copy)
  const hash = contentHash(copy)
  return {
    version: 1,
    id: `${kind}:${hash}`,
    kind,
    logicalId,
    hash,
    createdAt: now,
    bytes: new TextEncoder().encode(encoded).length,
    payload: copy,
  } as SourceRecord
}
export function validateSource(source: SourceRecord): void {
  if (
    !source ||
    source.version !== 1 ||
    !['ranges', 'script'].includes(source.kind)
  )
    throw Error('Unsupported reference version')
  const restored =
    source.kind === 'ranges'
      ? createSource(
          'ranges',
          source.logicalId,
          source.payload,
          source.createdAt,
        )
      : createSource(
          'script',
          source.logicalId,
          source.payload,
          source.createdAt,
        )
  if (
    restored.id !== source.id ||
    restored.hash !== source.hash ||
    restored.bytes !== source.bytes
  )
    throw Error('Reference content/version mismatch')
}
