export function seatPosition(button: number, seat: number): string {
  if (
    !Number.isInteger(button) ||
    !Number.isInteger(seat) ||
    button < 0 ||
    button > 5 ||
    seat < 0 ||
    seat > 5
  )
    throw new Error("Invalid seat");
  return ["BTN", "SB", "BB", "LJ", "HJ", "CO"][(seat - button + 6) % 6];
}
