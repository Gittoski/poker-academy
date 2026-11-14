import type { LearningConfig, ProblemRecord, SchedulerState } from './types'
import { configKey } from './keys'
export function nextRandom(seed: number): [number, number] {
  let n = seed >>> 0 || 1
  n ^= n << 13
  n ^= n >>> 17
  n ^= n << 5
  n >>>= 0
  return [n / 4294967296, n]
}
export function initialScheduler(
  seed = crypto.getRandomValues(new Uint32Array(1))[0],
): SchedulerState {
  const [r, next] = nextRandom(seed)
  return {
    version: 1,
    enabled: true,
    interval: 10,
    seed: next,
    index: 0,
    slot: Math.floor(r * 10),
  }
}
export function configureScheduler(
  state: SchedulerState,
  enabled: boolean,
  interval: number,
): SchedulerState {
  if (!Number.isInteger(interval) || interval < 2 || interval > 20)
    throw Error('Review interval must be 2–20')
  const [r, seed] = nextRandom(state.seed)
  return {
    ...state,
    enabled,
    interval,
    seed,
    index: 0,
    slot: Math.floor(r * interval),
  }
}
/** Advance only after hands with player decisions; never consumes the dealer RNG. */
export function advanceScheduler(state: SchedulerState): SchedulerState {
  if (!state.enabled) return state
  if (state.index + 1 < state.interval)
    return { ...state, index: state.index + 1 }
  const [r, seed] = nextRandom(state.seed)
  return { ...state, index: 0, slot: Math.floor(r * state.interval), seed }
}
export function compatible(
  problem: ProblemRecord,
  config: LearningConfig,
): boolean {
  return (
    configKey(problem.config) === configKey(config) &&
    (!config.seat || problem.hero === config.seat)
  )
}
export function selectProblem(
  state: SchedulerState,
  problems: ProblemRecord[],
  config: LearningConfig,
  now: number,
): ProblemRecord | null {
  if (!state.enabled || state.index !== state.slot) return null
  const eligible = problems.filter(
    (p) => compatible(p, config) && p.dueAt <= now,
  )
  // Deterministic priority is a learning heuristic, not an opponent or strength model.
  eligible.sort(
    (a, b) =>
      (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) ||
      a.dueAt - b.dueAt ||
      b.errors - a.errors ||
      a.id.localeCompare(b.id),
  )
  return eligible[0] ?? null
}
