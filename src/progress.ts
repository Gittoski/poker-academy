export type Progress = {
  version: 2;
  completed: string[];
  xp: number;
  attempts: Record<string, { correct: number; total: number }>;
};
export const freshProgress = (): Progress => ({
  version: 2,
  xp: 0,
  completed: [],
  attempts: {},
});
export function decodeProgress(raw: string | null): Progress {
  if (!raw) return freshProgress();
  const p = JSON.parse(raw);
  if (
    !p ||
    (p.version !== 1 && p.version !== 2) ||
    !Number.isSafeInteger(p.xp) ||
    p.xp < 0 ||
    !p.attempts ||
    typeof p.attempts !== "object" ||
    Array.isArray(p.attempts)
  )
    throw new Error("Unsupported or damaged progress");
  for (const a of Object.values(p.attempts) as {
    correct: number;
    total: number;
  }[])
    if (
      !a ||
      !Number.isSafeInteger(a.correct) ||
      !Number.isSafeInteger(a.total) ||
      a.correct < 0 ||
      a.total < a.correct ||
      a.total === 0
    )
      throw new Error("Damaged attempts");
  if (
    (p.version === 2 && p.completed === undefined) ||
    (p.completed !== undefined &&
      (!Array.isArray(p.completed) ||
        p.completed.some((x: unknown) => typeof x !== "string") ||
        new Set(p.completed).size !== p.completed.length))
  )
    throw new Error("Damaged lesson completion");
  return {
    version: 2,
    xp: p.xp,
    completed: p.completed ?? [],
    attempts: Object.fromEntries(
      Object.entries(p.attempts).map(([k, v]) => [
        k,
        {
          correct: (v as { correct: number }).correct,
          total: (v as { total: number }).total,
        },
      ]),
    ),
  };
}
export const level = (xp: number) => 1 + Math.floor(xp / 100);
export function record(p: Progress, topic: string, correct: boolean): Progress {
  const old = Object.hasOwn(p.attempts, topic)
    ? p.attempts[topic]
    : { correct: 0, total: 0 };
  const xp = p.xp + (correct ? 10 : 2);
  if (!Number.isSafeInteger(xp) || !Number.isSafeInteger(old.total + 1))
    throw new Error("Progress limit reached");
  return {
    ...p,
    xp,
    attempts: {
      ...p.attempts,
      [topic]: { correct: old.correct + Number(correct), total: old.total + 1 },
    },
  };
}
export function completeLesson(p: Progress, id: string): Progress {
  if (p.completed.includes(id)) return p;
  const xp = p.xp + 20;
  if (!Number.isSafeInteger(xp)) throw new Error("Progress limit reached");
  return { ...p, xp, completed: [...p.completed, id] };
}
export function weaknesses(p: Progress) {
  return Object.entries(p.attempts).sort(
    (a, b) =>
      a[1].correct / a[1].total - b[1].correct / b[1].total ||
      b[1].total - a[1].total ||
      a[0].localeCompare(b[0]),
  );
}
