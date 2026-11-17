import { expect, it } from 'vitest'
import { DECK, type Card, type HoleCards } from '@/lib/cards'
import { actLive, assertLiveState, legalLiveActions, newLiveHand, type LiveState, type LiveAction } from './liveEngine'
let seed = 123456
const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
const card = (text: string) => ({ rank: text[0], suit: text[1] }) as Card
function rig(s: LiveState, hands: string[][], board: string[]) {
  const sb = hands.length === 2 ? s.config.button : (s.config.button + 1) % hands.length
  const front: Card[] = []
  for (let round = 0; round < 2; round++) for (let k = 0; k < hands.length; k++) front.push(card(hands[(sb + k) % hands.length][round]))
  const planned = new Set([...hands.flat(), ...board])
  const burns = DECK.filter(c => !planned.has(c.rank + c.suit)).slice(0, 3)
  front.push(burns[0], ...board.slice(0, 3).map(card), burns[1], card(board[3]), burns[2], card(board[4]))
  const used = new Set(front.map(c => c.rank + c.suit))
  s.deck = [...front, ...DECK.filter(c => !used.has(c.rank + c.suit))]
  s.seats.forEach((p, i) => { p.cards = hands[i].map(card) as HoleCards })
  assertLiveState(s)
  return s
}

it('posts blinds, handles heads-up order and allows the BB option', () => {
  let s = newLiveHand({ stacks: [1000, 1000], button: 0, smallBlind: 5, bigBlind: 10 }, rng)
  expect(s.toAct).toBe(0)
  expect(s.seats.map(p => p.streetBet)).toEqual([5, 10])
  s = actLive(s, { kind: 'call' })
  expect(s.toAct).toBe(1)
  expect(legalLiveActions(s).check).toBe(true)
  s = actLive(s, { kind: 'check' })
  expect(s.street).toBe('flop')
  expect(s.toAct).toBe(1)
  expect(s.board).toHaveLength(3)
})

it('rejects invalid actions without changing the original hand', () => {
  const s = newLiveHand({ stacks: [1000, 1000, 1000], button: 0, smallBlind: 5, bigBlind: 10 }, rng)
  const before = structuredClone(s)
  for (const a of [{ kind: 'check' }, { kind: 'raise', to: 11 }, { kind: 'raise', to: 1001 }, { kind: 'raise', to: 20.5 }] as LiveAction[]) expect(() => actLive(s, a)).toThrow()
  expect(s).toEqual(before)
})

it('refunds uncalled bets and settles a fold without exposing a runout', () => {
  let s = newLiveHand({ stacks: [1000, 1000], button: 0, smallBlind: 5, bigBlind: 10 }, rng)
  s = actLive(s, { kind: 'raise', to: 100 })
  s = actLive(s, { kind: 'fold' })
  expect(s.street).toBe('complete')
  expect(s.board).toHaveLength(0)
  expect(s.refunds).toEqual([{ seat: 0, amount: 90 }])
  expect(s.seats.map(p => p.stack)).toEqual([1010, 990])
  assertLiveState(s)
})

it('settles unequal all-ins into independently eligible main and side pots', () => {
  let s = rig(newLiveHand({ stacks: [50, 100, 200], button: 0, smallBlind: 5, bigBlind: 10 }, rng),
    [['As', 'Ah'], ['Ks', 'Kh'], ['Qs', 'Qh']], ['2s', '3h', '7d', '8c', '9s'])
  s = actLive(s, { kind: 'raise', to: 50 })
  s = actLive(s, { kind: 'raise', to: 100 })
  s = actLive(s, { kind: 'call' })
  expect(s.street).toBe('complete')
  expect(s.board).toHaveLength(5)
  expect(s.pots.map(p => ({ amount: p.amount, winners: p.winners }))).toEqual([{ amount: 150, winners: [0] }, { amount: 100, winners: [1] }])
  expect(s.seats.map(p => p.stack)).toEqual([150, 100, 100])
})

it('does not reopen raising after a single short all-in', () => {
  let s = newLiveHand({ stacks: [1000, 130, 1000, 1000], button: 1, smallBlind: 5, bigBlind: 10 }, rng)
  s = actLive(s, { kind: 'raise', to: 100 })
  s = actLive(s, { kind: 'raise', to: 130 })
  s = actLive(s, { kind: 'call' })
  s = actLive(s, { kind: 'fold' })
  expect(s.toAct).toBe(0)
  expect(legalLiveActions(s).call).toBe(30)
  expect(legalLiveActions(s).minRaiseTo).toBeNull()
  expect(() => actLive(s, { kind: 'raise', to: 220 })).toThrow()
})

it('reopens action after cumulative short all-ins reach a full raise', () => {
  let s = newLiveHand({ stacks: [1000, 130, 190, 1000, 1000], button: 2, smallBlind: 5, bigBlind: 10 }, rng)
  for (const to of [100, 130, 190]) s = actLive(s, { kind: 'raise', to })
  s = actLive(s, { kind: 'call' })
  s = actLive(s, { kind: 'fold' })
  expect(s.toAct).toBe(0)
  expect(legalLiveActions(s).minRaiseTo).toBe(280)
  expect(actLive(s, { kind: 'raise', to: 280 }).bet).toBe(280)
})

it('treats BBA as shared dead money rather than extra BB side-pot eligibility', () => {
  const s = newLiveHand({ stacks: [100, 100, 100], button: 0, smallBlind: 5, bigBlind: 10, ante: { kind: 'big-blind', amount: 10 } }, rng)
  expect(s.pot).toBe(25)
  expect(s.deadMoney).toBe(10)
  expect(s.seats[2].stack).toBe(80)
  expect(s.seats[2].committed).toBe(10)
})

it('posts per-player antes before blinds without negative stacks', () => {
  const s = newLiveHand({ stacks: [3, 20, 100], button: 0, smallBlind: 5, bigBlind: 10, ante: { kind: 'each', amount: 5 } }, rng)
  expect(s.seats[0].stack).toBe(0)
  expect(s.seats[0].committed).toBe(3)
  expect(s.pot).toBe(28)
  assertLiveState(s)
})

it('conserves chips and unique cards through 1000 randomized legal hands', () => {
  for (let hand = 0; hand < 1000; hand++) {
    const n = 2 + Math.floor(rng() * 8)
    let s = newLiveHand({ stacks: Array.from({ length: n }, () => 1 + Math.floor(rng() * 1000)), button: hand % n, smallBlind: 5, bigBlind: 10,
      ...(hand % 3 ? { ante: { kind: hand % 2 ? 'each' as const : 'big-blind' as const, amount: 10 } } : {}) }, rng)
    let steps = 0
    while (s.street !== 'complete' && steps++ < 500) {
      const l = legalLiveActions(s), roll = rng()
      const action: LiveAction = l.minRaiseTo !== null && roll < 0.2
        ? { kind: 'raise', to: rng() < 0.5 ? l.minRaiseTo : l.maxRaiseTo! }
        : l.check ? { kind: 'check' } : roll < 0.5 ? { kind: 'fold' } : { kind: 'call' }
      s = actLive(s, action)
      assertLiveState(s)
    }
    expect(s.street).toBe('complete')
    expect(s.seats.reduce((sum, p) => sum + p.stack, 0)).toBe(s.totalChips)
  }
})

it('splits tied pots and assigns odd chips clockwise after the button', () => {
  let s = rig(newLiveHand({ stacks: [100, 100, 100], button: 0, smallBlind: 5, bigBlind: 10, ante: { kind: 'each', amount: 1 } }, rng),
    [['2h', '3h'], ['4h', '5h'], ['6h', '7h']], ['Ts', 'Js', 'Qs', 'Ks', 'As'])
  s = actLive(s, { kind: 'fold' })
  s = actLive(s, { kind: 'call' })
  while (s.street !== 'complete') s = actLive(s, { kind: 'check' })
  expect(s.payouts).toEqual([0, 12, 11])
  expect(s.seats.map(p => p.stack)).toEqual([99, 101, 100])
})

it('runs out an all-in blind without requiring meaningless checks', () => {
  const s = newLiveHand({ stacks: [5, 100], button: 0, smallBlind: 5, bigBlind: 10 }, rng)
  expect(s.street).toBe('complete')
  expect(s.toAct).toBeNull()
  expect(s.board).toHaveLength(5)
  expect(s.refunds).toEqual([{ seat: 1, amount: 5 }])
})

it('makes a short BB ante dead money available to the main-pot winner', () => {
  let s = rig(newLiveHand({ stacks: [10, 100, 20], button: 0, smallBlind: 5, bigBlind: 10, ante: { kind: 'big-blind', amount: 10 } }, rng),
    [['As', 'Ah'], ['Ks', 'Kh'], ['Qs', 'Qh']], ['2s', '3h', '7d', '8c', '9s'])
  s = actLive(s, { kind: 'call' })
  s = actLive(s, { kind: 'call' })
  expect(s.street).toBe('complete')
  expect(s.pots[0].amount).toBe(40)
  expect(s.pots[0].winners).toEqual([0])
  expect(s.seats.map(p => p.stack)).toEqual([40, 90, 0])
})

it('a prior checker can raise a short all-in opening bet', () => {
  let s = newLiveHand({ stacks: [100, 100, 15], button: 0, smallBlind: 5, bigBlind: 10 }, rng)
  s = actLive(s, { kind: 'call' })
  s = actLive(s, { kind: 'call' })
  s = actLive(s, { kind: 'check' })
  expect(s.street).toBe('flop')
  expect(s.toAct).toBe(1)
  s = actLive(s, { kind: 'check' })
  s = actLive(s, { kind: 'raise', to: 5 })
  s = actLive(s, { kind: 'call' })
  expect(s.toAct).toBe(1)
  expect(legalLiveActions(s).minRaiseTo).toBe(15)
  expect(() => actLive(s, { kind: 'raise', to: 15 })).not.toThrow()
})

it('combines dead-money layers into one pot and splits its odd chips only once', () => {
  let s = rig(newLiveHand({ stacks: [100, 100, 100, 100, 100], button: 2, smallBlind: 5, bigBlind: 10 }, rng),
    [['2h', '3h'], ['4h', '5h'], ['6h', '7h'], ['8h', '9h'], ['Th', 'Jh']], ['Ts', 'Js', 'Qs', 'Ks', 'As'])
  s = actLive(s, { kind: 'raise', to: 21 })
  s = actLive(s, { kind: 'call' })
  s = actLive(s, { kind: 'call' })
  s = actLive(s, { kind: 'fold' })
  s = actLive(s, { kind: 'fold' })
  s = actLive(s, { kind: 'check' })
  s = actLive(s, { kind: 'raise', to: 10 })
  s = actLive(s, { kind: 'call' })
  s = actLive(s, { kind: 'fold' })
  while (s.street !== 'complete') s = actLive(s, { kind: 'check' })
  expect(s.pots).toEqual([{ amount: 98, eligible: [1, 2], winners: [1, 2] }])
  expect(s.payouts).toEqual([0, 49, 49, 0, 0])
  assertLiveState(s)
})
