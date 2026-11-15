/** Card IDs 0..51: rank = floor(id/4)+2, suit = id%4. Suits have equal value. */
export const deck = () => Array.from({ length: 52 }, (_, i) => i);
function validate(cards: number[], min: number, max: number) {
  if (
    cards.length < min ||
    cards.length > max ||
    cards.some((c) => !Number.isInteger(c) || c < 0 || c > 51) ||
    new Set(cards).size !== cards.length
  )
    throw new Error("Invalid or duplicate cards");
}
export function compare(a: number[], b: number[]) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return Math.sign(d);
  }
  return 0;
}
/** Lexicographic score: category 0 high card through 8 straight flush, then kickers. */
export function five(cards: number[]): number[] {
  validate(cards, 5, 5);
  const ranks = cards.map((c) => Math.floor(c / 4) + 2).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.every((c) => c % 4 === cards[0] % 4);
  const unique = [...counts.keys()].sort((a, b) => b - a);
  const straight =
    unique.length === 5
      ? unique[0] - unique[4] === 4
        ? unique[0]
        : unique.join(",") === "14,5,4,3,2"
          ? 5
          : 0
      : 0;
  if (flush && straight) return [8, straight];
  if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0]];
  if (groups[0][1] === 3 && groups[1][1] === 2)
    return [6, groups[0][0], groups[1][0]];
  if (flush) return [5, ...ranks];
  if (straight) return [4, straight];
  if (groups[0][1] === 3) return [3, ...groups.map((g) => g[0])];
  if (groups[0][1] === 2 && groups[1][1] === 2)
    return [2, ...groups.map((g) => g[0])];
  if (groups[0][1] === 2) return [1, ...groups.map((g) => g[0])];
  return [0, ...ranks];
}
export function best(cards: number[]): number[] {
  validate(cards, 5, 7);
  let result: number[] = [];
  for (let a = 0; a < cards.length - 4; a++)
    for (let b = a + 1; b < cards.length - 3; b++)
      for (let c = b + 1; c < cards.length - 2; c++)
        for (let d = c + 1; d < cards.length - 1; d++)
          for (let e = d + 1; e < cards.length; e++) {
            const score = five([
              cards[a],
              cards[b],
              cards[c],
              cards[d],
              cards[e],
            ]);
            if (!result.length || compare(score, result) > 0) result = score;
          }
  return result;
}
