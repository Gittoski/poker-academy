import { expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import {
  advancePostflop,
  boardShown,
  currentNode,
  startPostflop,
  resultMessage,
  type HandScript,
} from '@/lib/fullHands'
import { startHand } from '@/lib/handSim'
import { completionSummary, postAnswerPresentation } from './completion'
const setup = {
  format: 'cash',
  stack: 100,
  rangeType: 'pto',
  openSize: 2.5,
  players: 6,
} as const
const suits = { s: 's', h: 'h', d: 'd', c: 'c' } as const
const scripts: HandScript[] = readdirSync('public/full-hands', {
  withFileTypes: true,
})
  .filter((e) => e.isDirectory())
  .flatMap((dir) =>
    readdirSync(path.join('public/full-hands', dir.name))
      .filter((f) => f.endsWith('.json'))
      .map((file) =>
        JSON.parse(
          readFileSync(path.join('public/full-hands', dir.name, file), 'utf8'),
        ),
      ),
  )
const hand = startHand(setup, () => 0.5)
it('does not call the end of preflop a completed full hand', () => {
  const s = scripts[0]
  expect(completionSummary(s, hand, null)).toBeNull()
  expect(
    completionSummary(
      s,
      { ...hand, toAct: null, ended: { kind: 'flop', message: 'See a flop' } },
      null,
    ),
  ).toBeNull()
  expect(completionSummary(s, hand, startPostflop())).toBeNull()
})
it('reports an actual preflop fold without borrowing the unplayed script result', () => {
  const message = completionSummary(
    scripts[0],
    {
      ...hand,
      toAct: null,
      ended: { kind: 'hero-folded', message: 'You folded.' },
    },
    null,
  )
  expect(message).toContain('You folded preflop')
  expect(message).not.toContain('Showdown')
  expect(message).not.toContain('wins')
})
it('uses the actual uncontested/walk outcome rather than an unplayed script', () => {
  expect(
    completionSummary(
      scripts[0],
      {
        ...hand,
        toAct: null,
        ended: { kind: 'walk', message: 'BB takes the blinds.' },
      },
      null,
    ),
  ).toBe('BB takes the blinds.')
})
it('all 780 supplied lines reach their recorded terminal outcome; early calls have complete stored showdowns', () => {
  let flopCalls = 0,
    turnCalls = 0
  expect(scripts).toHaveLength(780)
  for (const script of scripts) {
    let play = startPostflop(),
      last = currentNode(script, play)!,
      steps = 0
    while (!play.done) {
      last = currentNode(script, play)!
      expect(last).toBeTruthy()
      play = advancePostflop(script, play)
      if (++steps > 100) throw Error('Non-terminating supplied line')
    }
    expect(completionSummary(script, hand, play)).toContain(
      resultMessage(script),
    )
    if (script.result.kind === 'showdown') {
      expect(boardShown(script, play, suits)).toHaveLength(5)
      if (script.streets.at(-1)!.street === 'flop') {
        flopCalls++
        expect(last.actions[last.chosen].a).toBe('C')
      }
      if (script.streets.at(-1)!.street === 'turn') {
        turnCalls++
        expect(last.actions[last.chosen].a).toBe('C')
      }
    } else expect(last.actions[last.chosen].a).toBe('F')
  }
  expect(flopCalls).toBe(6)
  expect(turnCalls).toBe(18)
})
it('holds an early all-in call on its decision street until the user opens the complete runout', () => {
  const s = scripts.find(
    (s) => s.result.kind === 'showdown' && s.streets.at(-1)!.street === 'flop',
  )!
  let before = startPostflop()
  while (before.nodeIndex < s.streets[0].nodes.length - 1)
    before = advancePostflop(s, before)
  const copy = structuredClone(before),
    after = advancePostflop(s, before)
  expect(after.done).toBe(true)
  expect(boardShown(s, postAnswerPresentation(s, before), suits)).toHaveLength(
    3,
  )
  expect(boardShown(s, after, suits)).toHaveLength(5)
  expect(completionSummary(s, hand, after)).toContain(
    'remaining board was dealt for showdown',
  )
  expect(before).toEqual(copy)
})
it('keeps flop feedback on the flop even when the engine has advanced to the turn', () => {
  const s = scripts.find((s) => s.streets.length > 1)!
  let before = startPostflop()
  while (before.nodeIndex < s.streets[0].nodes.length - 1)
    before = advancePostflop(s, before)
  const next = advancePostflop(s, before),
    shown = postAnswerPresentation(s, before)
  expect(next.streetIndex).toBe(1)
  expect(shown.streetIndex).toBe(0)
  expect(boardShown(s, shown, suits)).toHaveLength(3)
  expect(boardShown(s, next, suits)).toHaveLength(4)
})
