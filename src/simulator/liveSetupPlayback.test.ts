import { expect, it } from 'vitest'
import {
  PREFLOP_CONTEXTS,
  preflopConfig,
  preflopPrefix,
} from './preflopCatalog'
import { practiceLiveDeal, freshLiveDeal, type LiveDeal } from './liveSession'
import { startSetupPlayback, publicActionLabel } from './liveSetupPlayback'

it('replays all 65 supplied setups through legal public states without altering the saved decision', () => {
  for (const context of PREFLOP_CONTEXTS) {
    const deal: LiveDeal = {
      ...freshLiveDeal(
        preflopConfig(),
        context.hero,
        'balanced',
        42,
        'preflop',
      ),
      graded: { version: 1, context: context.id },
      actions: preflopPrefix(context),
      feedback: [],
    }
    const original = JSON.stringify(deal)
    expect(startSetupPlayback(deal)).toEqual({ deal, shown: 0 })
    for (let shown = 0; shown <= deal.actions.length; shown++) {
      const state = practiceLiveDeal(deal, shown)
      expect(state.board).toEqual([])
      expect(state.toAct).not.toBeNull()
      expect(state.heroFolded).toBeUndefined()
      const label = publicActionLabel(deal, shown)
      if (!shown) expect(label).toBeNull()
      else {
        expect(label).toMatch(/^(LJ|HJ|CO|BTN|SB|BB) (folds|raises to .+ BB)$/)
        expect(publicActionLabel({ ...deal, seed: 98765 }, shown)).toBe(label)
      }
    }
    expect(practiceLiveDeal(deal).toAct).toBe(context.hero)
    expect(JSON.stringify(deal)).toBe(original)
  }
})

it('keeps normal live play, graded answers and saved attempts out of setup playback', () => {
  const deal = freshLiveDeal(preflopConfig(), 0, 'balanced', 42)
  expect(startSetupPlayback(deal)).toBeNull()
  const graded = {
    ...deal,
    mode: 'preflop' as const,
    graded: { version: 1 as const, context: 'open:LJ' },
  }
  expect(startSetupPlayback({ ...graded, attempt: true })).toBeNull()
  expect(
    startSetupPlayback({
      ...graded,
      feedback: [
        {
          index: 0,
          reference: {
            status: 'ungraded',
            source: 'Fixture',
            explanation: 'No grade',
          },
        },
      ],
    }),
  ).toBeNull()
})

it('describes public raises, calls, folds and checks without exposing private cards', () => {
  const deal = freshLiveDeal(preflopConfig(), 5, 'balanced', 42)
  deal.actions = [
    { kind: 'raise', to: 275 },
    { kind: 'call' },
    { kind: 'fold' },
    { kind: 'fold' },
    { kind: 'fold' },
    { kind: 'call' },
  ]
  expect(publicActionLabel(deal, 1)).toBe('LJ raises to 2.75 BB')
  expect(publicActionLabel(deal, 2)).toBe('HJ calls')
  expect(publicActionLabel(deal, 3)).toBe('CO folds')
  deal.actions = [...Array(5).fill({ kind: 'call' }), { kind: 'check' }]
  expect(publicActionLabel(deal)).toBe('BB checks')
  deal.actions.push({ kind: 'raise', to: 200 })
  expect(publicActionLabel(deal)).toBe('SB bets 2 BB')
  deal.actions.push({ kind: 'raise', to: 500 })
  expect(publicActionLabel(deal)).toBe('BB raises to 5 BB')
  for (const count of [-1, 0.5, 9])
    expect(() => publicActionLabel(deal, count)).toThrow('index')
})
