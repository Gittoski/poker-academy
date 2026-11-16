import type { RangeEntry } from '@/data/types'
import type { Card, HoleCards } from '@/lib/cards'
import type { GameMode } from '@/lib/gameModes'
import type { HandScript, PostflopPlay, SuitMap } from '@/lib/fullHands'
import type { Decision, HandState, Seat } from '@/lib/handSim'
import type { Grade, Prompt, Score, TrainerSetup } from '@/lib/trainer'
import type { Activity } from '@/activity/calendar'

export const LEARNING_VERSION = 1 as const
export type Origin = 'regular' | 'adaptive' | 'manual'
export type LearningKind = 'match' | 'alternative' | 'outside' | 'ungraded'
export interface LearningResult {
  version: 1
  kind: LearningKind
  frequency: number | null
  reason?: string
}
export interface FrequencyReference {
  values: number[]
  scale: 1 | 100
  applicable: boolean
}
export interface LearningConfig extends TrainerSetup {
  mode: GameMode
  rangesId: string
}
export type SourceRecord = {
  version: 1
  id: string
  logicalId: string
  hash: string
  bytes: number
  createdAt: number
} & (
  | { kind: 'ranges'; payload: RangeEntry[] }
  | { kind: 'script'; payload: HandScript }
)
export type PackedDecision = Omit<Decision, 'entry'> & { entryId: string }
export type PackedSeat = Omit<Seat, 'hand' | 'lastDecision'> & {
  lastDecision?: PackedDecision
}
export type PackedHand = Omit<HandState, 'seats'> & {
  rangesId: string
  seats: PackedSeat[]
}
export type SavedPrompt = Prompt & {
  street: 'preflop' | 'flop' | 'turn' | 'river'
  reference: FrequencyReference
  decision?: PackedDecision
}
export interface StoredVerdict {
  decisionId: string
  prompt: SavedPrompt
  guess: number
  legacyGrade: Grade
  learning: LearningResult
}
export interface Cursor {
  resultShown?: boolean
  version: 1
  handId: string
  hand: PackedHand
  play: PostflopPlay | null
  phase: 'npc' | 'hero' | 'verdict'
  verdict: StoredVerdict | null
  score: Score
  ordinal: number
  decisions: number
  forcedFold: boolean
  npcAction: 'raise' | 'call' | 'fold' | null
  rng: number
}
export interface ReviewTarget {
  problemId: string
  nodeKey: string
  variant: 'exact' | 'related'
}
export interface HandRecord {
  revision?: number
  version: 1
  id: string
  sessionId: string
  config: LearningConfig
  origin: Origin
  createdAt: number
  completedAt: number | null
  initial: PackedHand
  scriptId: string | null
  suitMap: SuitMap | null
  foldHand: boolean
  target: ReviewTarget | null
  targetAnswered: boolean
  decisions: number
  /** Normalized live history: public states are reconstructed from these engine inputs. */
  actions: { position: string; action: string }[]
}
export interface DecisionRecord {
  fundamentalSkills?: string[]
  history?: { position: string; action: string }[]
  version: 1
  id: string
  handId: string
  sessionId: string
  createdAt: number
  origin: Origin
  config: LearningConfig
  before: Cursor
  prompt: SavedPrompt
  chosen: number
  executed: number
  legacyGrade: Grade
  learning: LearningResult
  nodeKey: string
  skillKey: string
  exampleKey?: string
  problemId: string | null
  targeted: boolean
  firstExposure: boolean
  pinned: boolean
  note: string
}
export interface Counts {
  firstExposures?: number
  repeatExposures?: number
  decisions: number
  hands: number
  match: number
  alternative: number
  outside: number
  ungraded: number
}
export interface SessionRecord {
  version: 1
  id: string
  startedAt: number
  lastActivityAt: number
  endedAt: number | null
  activeMs: number
  compacted: boolean
  counts: Record<Origin, Counts>
}
export interface ProblemRecord {
  fundamentalSkills?: string[]
  pinnedExample?: string | null
  version: 1
  id: string
  nodeKey: string
  skillKey: string
  exampleKey?: string
  config: LearningConfig
  hero: string
  street: SavedPrompt['street']
  title: string
  firstSeenAt: number
  lastSeenAt: number
  errors: number
  reviews: number
  successes: number
  successSessions: string[]
  examples: string[]
  usedExamples: string[]
  status: 'active' | 'maintenance' | 'archive'
  dueAt: number
  lastReviewedAt: number | null
  note: string
  pinned: boolean
}
export interface SchedulerState {
  slotUsed?: boolean
  version: 1
  enabled: boolean
  interval: number
  seed: number
  index: number
  slot: number
}
export interface LearningMeta {
  activity?: Activity
  version: 1
  cursor: Cursor | null
  resume: Cursor | null
  sessionId: string | null
  scheduler: SchedulerState
  nextScheduler?: SchedulerState
  lastHandFinished: string | null
}
export interface LearningBackup {
  version: 1
  exportedAt: number
  sources: SourceRecord[]
  sessions: SessionRecord[]
  hands: HandRecord[]
  decisions: DecisionRecord[]
  problems: ProblemRecord[]
  meta: LearningMeta
}
export interface PublicDecision {
  hole: HoleCards
  board: Card[]
  hero: string
  title: string
}
