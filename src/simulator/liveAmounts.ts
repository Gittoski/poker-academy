/** Parse BB input without floating-point multiplication (e.g. 1.13 * 100). */
export function chipsFromBB(text: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text.trim())
  if (!match)
    throw Error('Use a non-negative BB amount with up to two decimal places.')
  const chips = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  if (!Number.isSafeInteger(chips)) throw Error('BB amount is too large.')
  return chips
}
