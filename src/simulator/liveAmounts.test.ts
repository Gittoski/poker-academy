import { expect, it } from 'vitest'
import { chipsFromBB } from './liveAmounts'
it('accepts every hundredth of a BB exactly and rejects fractional chips', () => {
  for (let chips = 0; chips <= 10000; chips++)
    expect(chipsFromBB((chips / 100).toFixed(2))).toBe(chips)
  for (const text of ['', '-1', '1.001', 'NaN', 'Infinity', '1e2'])
    expect(() => chipsFromBB(text)).toThrow()
})
