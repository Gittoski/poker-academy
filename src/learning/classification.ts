import type { Decision } from '@/lib/handSim'
import type { FrequencyReference, LearningKind, LearningResult } from './types'

export const LEARNING_LABELS: Record<LearningKind, string> = {
  match: 'Most-frequent reference match',
  alternative: 'Supported alternative',
  outside: 'Outside this reference',
  ungraded: 'Not classified',
}

/** Preserve source precision. Total tolerance covers numerical/percent rounding, never action support. */
export function validFrequencies(reference: FrequencyReference): boolean {
  const { values, scale, applicable } = reference
  if (
    !applicable ||
    (scale !== 1 && scale !== 100) ||
    values.length < 1 ||
    values.length > 12
  )
    return false
  if (values.some((v) => !Number.isFinite(v) || v < 0 || v > scale))
    return false
  const total = values.reduce((a, b) => a + b, 0)
  return total > 0 && Math.abs(total - scale) <= (scale === 1 ? 1e-6 : 1)
}
export function classify(
  reference: FrequencyReference | null,
  chosen: number,
): LearningResult {
  const ungraded = (): LearningResult => ({
    version: 1,
    kind: 'ungraded',
    frequency: null,
    reason: 'No applicable valid reference for this action.',
  })
  if (
    !reference ||
    !validFrequencies(reference) ||
    !Number.isInteger(chosen) ||
    chosen < 0 ||
    chosen >= reference.values.length
  )
    return ungraded()
  const frequency = reference.values[chosen] / reference.scale
  const kind =
    reference.values[chosen] === Math.max(...reference.values)
      ? 'match'
      : frequency > 0
        ? 'alternative'
        : 'outside'
  return { version: 1, kind, frequency }
}
export function preflopReference(decision: Decision): FrequencyReference {
  return {
    values: decision.actions.map((a) => decision.weights[a]),
    scale: 1,
    applicable: true,
  }
}
export function formatFrequency(value: number): string {
  if (value > 0 && value < 0.001) return '<0.1%'
  return `${Number((value * 100).toFixed(1))}%`
}
