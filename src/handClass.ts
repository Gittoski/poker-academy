export function handClass(cards: number[]): string {
  if (
    cards.length !== 2 ||
    cards.some((c) => !Number.isInteger(c) || c < 0 || c > 51) ||
    cards[0] === cards[1]
  )
    throw new Error("Invalid hole cards");
  const sorted = [...cards].sort((a, b) => b - a);
  const ranks = sorted.map((c) => "23456789TJQKA"[Math.floor(c / 4)]);
  return (
    ranks[0] +
    ranks[1] +
    (ranks[0] === ranks[1] ? "" : sorted[0] % 4 === sorted[1] % 4 ? "s" : "o")
  );
}
