export type Progress = { version: 1; xp: number; attempts: Record<string, { correct: number; total: number }> };
export const freshProgress = (): Progress => ({ version: 1, xp: 0, attempts: {} });
export function decodeProgress(raw: string | null): Progress {
  if (!raw) return freshProgress();
  const p = JSON.parse(raw);
  if (p.version !== 1 || !Number.isSafeInteger(p.xp) || p.xp < 0 || !p.attempts || typeof p.attempts !== 'object' || Array.isArray(p.attempts)) throw new Error('Unsupported or damaged progress');
  for (const a of Object.values(p.attempts) as any[]) if (!a || !Number.isSafeInteger(a.correct) || !Number.isSafeInteger(a.total) || a.correct < 0 || a.total < a.correct) throw new Error('Damaged attempts');
  return p;
}
export const level = (xp: number) => 1 + Math.floor(xp / 100);
export function record(p: Progress, topic: string, correct: boolean): Progress {
  const old = p.attempts[topic] ?? { correct: 0, total: 0 };
  return { ...p, xp: p.xp + (correct ? 10 : 2), attempts: { ...p.attempts, [topic]: { correct: old.correct + Number(correct), total: old.total + 1 } } };
}
