import { Action, Table, act, createTable } from "./table";
import {
  BaselineFeedback,
  evaluateBaseline,
  trainingTable,
  handClass,
  heroPosition,
  baselineName,
} from "./baselineCoach";
import { toHero } from "./bots";
export type Cursor = {
  mode: "free" | "coached";
  hand: number;
  refills: number;
  table: Table;
  coaching: BaselineFeedback[];
};
export type CursorRecord = {
  version: 2;
  mode: Cursor["mode"];
  hand: number;
  refills: number;
  seed: number;
  button: number;
  stacks: number[];
  actions: Action[];
};
export type DecisionAttempt = {
  id: number;
  before: CursorRecord;
  action: Action;
  feedback: BaselineFeedback;
  practice: boolean;
  retryOf: number | null;
  marked: boolean;
};
export type ReviewedHand = {
  id: number;
  record: CursorRecord;
  practice: boolean;
};
export type SimulatorSession = Cursor & {
  version: 3;
  attempts: DecisionAttempt[];
  archive: ReviewedHand[];
  nextId: number;
  practice: boolean;
  retryOf: number | null;
  resume: {
    record: CursorRecord;
    practice: boolean;
    retryOf: number | null;
  } | null;
};
export const MAX_ATTEMPTS = 200,
  MAX_HANDS = 30;
export function recordCursor(s: Cursor): CursorRecord {
  return {
    version: 2,
    mode: s.mode,
    hand: s.hand,
    refills: s.refills,
    seed: s.table.seed,
    button: s.table.button,
    stacks: [...s.table.initial],
    actions: s.table.actions.map((a) => ({ ...a })),
  };
}
function identity(r: CursorRecord) {
  return JSON.stringify([r.mode, r.hand, r.seed, r.button, r.stacks]);
}
function takeId(s: SimulatorSession) {
  if (!Number.isSafeInteger(s.nextId + 1))
    throw new Error("Review counter limit");
  return s.nextId;
}
function archiveCompleted(s: SimulatorSession): SimulatorSession {
  if (!s.table.done) return s;
  const record = recordCursor(s);
  const signature = JSON.stringify(record);
  if (s.archive.some((h) => JSON.stringify(h.record) === signature)) return s;
  const id = takeId(s);
  return {
    ...s,
    nextId: id + 1,
    archive: [...s.archive, { id, record, practice: s.practice }].slice(
      -MAX_HANDS,
    ),
  };
}
export function newSession(
  mode: Cursor["mode"] = "free",
  previous?: SimulatorSession,
): SimulatorSession {
  return {
    version: 3,
    mode,
    coaching: [],
    hand: 1,
    refills: 0,
    table: mode === "coached" ? trainingTable(42, 0) : toHero(createTable(42)),
    attempts: previous?.attempts ?? [],
    archive: previous?.archive ?? [],
    nextId: previous?.nextId ?? 1,
    practice: false,
    retryOf: null,
    resume: null,
  };
}
export function sessionAction(
  s: SimulatorSession,
  a: Action,
): SimulatorSession {
  const table = toHero(act(s.table, a));
  const id = takeId(s);
  const feedback = evaluateBaseline(s.table, a);
  const attempt: DecisionAttempt = {
    id,
    before: recordCursor(s),
    action: { ...a },
    feedback,
    practice: s.practice,
    retryOf: s.retryOf,
    marked: false,
  };
  return archiveCompleted({
    ...s,
    table,
    coaching: [...s.coaching, feedback],
    attempts: [...s.attempts, attempt].slice(-MAX_ATTEMPTS),
    nextId: id + 1,
    retryOf: null,
  });
}
export function continueSession(s: SimulatorSession): SimulatorSession {
  if (s.resume) return returnToLive(s);
  if (!s.table.done) throw new Error("Finish this hand first");
  if (!Number.isSafeInteger(s.hand + 1))
    throw new Error("Session counter limit");
  s = archiveCompleted(s);
  if (s.mode === "coached")
    return {
      ...s,
      hand: s.hand + 1,
      coaching: [],
      practice: false,
      retryOf: null,
      table: trainingTable((s.table.seed + 1) >>> 0, s.hand),
    };
  const refills = s.table.players.filter((p) => p.stack <= 2).length;
  if (!Number.isSafeInteger(s.refills + refills))
    throw new Error("Refill limit");
  return archiveCompleted({
    ...s,
    hand: s.hand + 1,
    refills: s.refills + refills,
    coaching: [],
    practice: false,
    retryOf: null,
    table: toHero(
      createTable(
        (s.table.seed + 1) >>> 0,
        s.table.players.map((p) => (p.stack <= 2 ? 200 : p.stack)),
        (s.table.button + 1) % 6,
      ),
    ),
  });
}
export function currentDecision(s: SimulatorSession) {
  if (s.retryOf !== null) return undefined;
  const here = recordCursor(s);
  return [...s.attempts]
    .reverse()
    .find(
      (d) =>
        identity(d.before) === identity(here) &&
        JSON.stringify(here.actions.slice(0, d.before.actions.length + 1)) ===
          JSON.stringify([...d.before.actions, d.action]),
    );
}
export function retryDecision(
  s: SimulatorSession,
  id: number,
): SimulatorSession {
  const d = s.attempts.find((d) => d.id === id);
  if (!d) throw new Error("This decision is no longer in saved history");
  const cursor = readCursor(d.before);
  if (cursor.table.done || cursor.table.actor !== 0)
    throw new Error("Invalid retry point");
  return { ...s, ...cursor, practice: true, retryOf: id };
}
export function practiceDecision(
  s: SimulatorSession,
  id: number,
): SimulatorSession {
  const resume = s.resume ?? {
    record: recordCursor(s),
    practice: s.practice,
    retryOf: s.retryOf,
  };
  return { ...retryDecision(s, id), resume };
}
export function returnToLive(s: SimulatorSession): SimulatorSession {
  if (!s.resume) throw new Error("No saved live table");
  const r = s.resume;
  return {
    ...s,
    ...readCursor(r.record),
    practice: r.practice,
    retryOf: r.retryOf,
    resume: null,
  };
}
export function markDecision(
  s: SimulatorSession,
  id: number,
): SimulatorSession {
  if (!s.attempts.some((d) => d.id === id))
    throw new Error("Decision not found");
  return {
    ...s,
    attempts: s.attempts.map((d) =>
      d.id === id ? { ...d, marked: !d.marked } : d,
    ),
  };
}
export function decisionTable(d: DecisionAttempt): Table {
  return readCursor(d.before).table;
}
export function reviewStates(h: ReviewedHand): Table[] {
  const r = h.record;
  let t = createTable(r.seed, r.stacks, r.button);
  const states = [t];
  for (const a of r.actions) {
    t = act(t, a);
    states.push(t);
  }
  return states;
}
export function troublesomeSpots(s: SimulatorSession) {
  const groups = new Map<
    string,
    { key: string; label: string; attempts: DecisionAttempt[] }
  >();
  for (const d of s.attempts) {
    const t = decisionTable(d);
    const key =
      d.feedback.status === "ungraded"
        ? `manual:${identity(d.before)}:${d.before.actions.length}`
        : `${baselineName}:${heroPosition(t.button)}:${handClass(t.players[0].hole)}`;
    const g = groups.get(key) ?? {
      key,
      label: `${handClass(t.players[0].hole)} · ${heroPosition(t.button)} · ${["Preflop", "Flop", "Turn", "River"][t.stage]}`,
      attempts: [],
    };
    g.attempts.push(d);
    groups.set(key, g);
  }
  return [...groups.values()]
    .filter((g) =>
      g.attempts.some((d) => d.marked || d.feedback.status === "deviation"),
    )
    .map((g) => ({
      ...g,
      latest: g.attempts.at(-1)!,
      deviations: g.attempts.filter((d) => d.feedback.status === "deviation")
        .length,
      needsReview:
        g.attempts.at(-1)!.feedback.status === "deviation" ||
        (g.attempts.at(-1)!.feedback.status === "ungraded" &&
          g.attempts.some((d) => d.marked)),
      target: [...g.attempts]
        .reverse()
        .find((d) => d.marked || d.feedback.status === "deviation")!,
      firstTries: g.attempts.filter(
        (d) => !d.practice && d.feedback.status !== "ungraded",
      ).length,
      firstMatches: g.attempts.filter(
        (d) => !d.practice && d.feedback.status === "match",
      ).length,
      retries: g.attempts.filter((d) => d.practice).length,
    }))
    .sort(
      (a, b) =>
        Number(b.needsReview) - Number(a.needsReview) ||
        b.deviations - a.deviations ||
        b.latest.id - a.latest.id,
    );
}
export function encodeSession(s: SimulatorSession): string {
  return JSON.stringify({
    ...recordCursor(s),
    version: 3,
    nextId: s.nextId,
    practice: s.practice,
    retryOf: s.retryOf,
    resume: s.resume,
    attempts: s.attempts.map(({ feedback, ...d }) => d),
    archive: s.archive,
  });
}
function positive(n: unknown): n is number {
  return typeof n === "number" && Number.isSafeInteger(n) && n > 0;
}
function optionalId(n: unknown): n is number | null {
  return n === null || positive(n);
}
export function decodeSession(raw: string | null): SimulatorSession {
  if (raw === null) return newSession();
  if (raw.length > 4_000_000) throw new Error("Table library too large");
  const p = JSON.parse(raw);
  const cursor = readCursor(p);
  if (p.version < 3) {
    let s = { ...newSession(cursor.mode), ...cursor };
    let table = createTable(p.seed, p.stacks, p.button);
    for (const action of p.actions) {
      if (table.actor === 0) {
        const before = recordCursor({ ...cursor, table });
        const id = s.nextId++;
        s.attempts.push({
          id,
          before,
          action,
          feedback: evaluateBaseline(table, action),
          practice: false,
          retryOf: null,
          marked: false,
        });
      }
      table = act(table, action);
    }
    s.attempts = s.attempts.slice(-MAX_ATTEMPTS);
    return archiveCompleted(s);
  }
  if (
    !positive(p.nextId) ||
    typeof p.practice !== "boolean" ||
    !optionalId(p.retryOf) ||
    !Array.isArray(p.attempts) ||
    p.attempts.length > MAX_ATTEMPTS ||
    !Array.isArray(p.archive) ||
    p.archive.length > MAX_HANDS
  )
    throw new Error("Damaged review library");
  const ids = new Set<number>();
  function id(n: unknown) {
    if (!positive(n) || n >= p.nextId || ids.has(n))
      throw new Error("Invalid review ID");
    ids.add(n);
    return n;
  }
  const attempts: DecisionAttempt[] = p.attempts.map((d: any) => {
    if (
      !d ||
      typeof d.practice !== "boolean" ||
      typeof d.marked !== "boolean" ||
      !optionalId(d.retryOf)
    )
      throw new Error("Invalid decision");
    const decisionId = id(d.id);
    if (d.retryOf !== null && d.retryOf >= decisionId)
      throw new Error("Invalid retry reference");
    const before = readCursor(d.before);
    if (before.table.done || before.table.actor !== 0)
      throw new Error("Invalid decision checkpoint");
    const action = readAction(d.action);
    act(before.table, action);
    return {
      id: decisionId,
      before: recordCursor(before),
      action,
      feedback: evaluateBaseline(before.table, action),
      practice: d.practice,
      retryOf: d.retryOf,
      marked: d.marked,
    };
  });
  if (attempts.some((d, i) => i > 0 && d.id <= attempts[i - 1].id))
    throw new Error("Decision order is damaged");
  const archive: ReviewedHand[] = p.archive.map((h: any) => {
    if (!h || typeof h.practice !== "boolean")
      throw new Error("Invalid reviewed hand");
    const handId = id(h.id);
    const record = readCursor(h.record);
    if (!record.table.done) throw new Error("Saved hand is incomplete");
    return { id: handId, record: recordCursor(record), practice: h.practice };
  });
  let resume: SimulatorSession["resume"] = null;
  if (p.resume !== null) {
    if (
      !p.resume ||
      typeof p.resume.practice !== "boolean" ||
      !optionalId(p.resume.retryOf)
    )
      throw new Error("Invalid live checkpoint");
    resume = {
      record: recordCursor(readCursor(p.resume.record)),
      practice: p.resume.practice,
      retryOf: p.resume.retryOf,
    };
  }
  if (p.retryOf !== null && p.retryOf >= p.nextId)
    throw new Error("Invalid active retry");
  return {
    ...cursor,
    version: 3,
    attempts,
    archive,
    nextId: p.nextId,
    practice: p.practice,
    retryOf: p.retryOf,
    resume,
  };
}
function readAction(a: any): Action {
  if (!a || typeof a !== "object") throw new Error("Invalid action");
  if (a.type === "fold" || a.type === "call" || a.type === "check")
    return { type: a.type };
  if (a.type === "raise" && Number.isSafeInteger(a.to))
    return { type: "raise", to: a.to };
  throw new Error("Invalid action");
}
function readCursor(p: any): Cursor {
  if (
    !p ||
    (p.version !== 1 && p.version !== 2 && p.version !== 3) ||
    (p.version >= 2 && p.mode !== "free" && p.mode !== "coached") ||
    !Number.isSafeInteger(p.hand) ||
    p.hand < 1 ||
    !Number.isSafeInteger(p.refills) ||
    p.refills < 0 ||
    !Number.isSafeInteger(p.seed) ||
    p.seed < 0 ||
    p.seed > 0xffffffff ||
    !Number.isInteger(p.button) ||
    p.button < 0 ||
    p.button > 5 ||
    !Array.isArray(p.stacks) ||
    p.stacks.length !== 6 ||
    p.stacks.some(
      (n: unknown) =>
        typeof n !== "number" || !Number.isSafeInteger(n) || n < 0,
    ) ||
    !Number.isSafeInteger(
      p.stacks.reduce((sum: number, n: number) => sum + n, 0),
    ) ||
    !Array.isArray(p.actions) ||
    p.actions.length > 2048
  )
    throw new Error("Unsupported or damaged table session");
  const actions: Action[] = p.actions.map((a: unknown) => {
    if (!a || typeof a !== "object" || !("type" in a))
      throw new Error("Invalid action");
    const v = a as { type: string; to?: number };
    if (v.type === "fold" || v.type === "check" || v.type === "call")
      return { type: v.type };
    if (v.type === "raise" && Number.isSafeInteger(v.to))
      return { type: "raise", to: v.to! };
    throw new Error("Invalid action");
  });
  let table = createTable(p.seed, p.stacks, p.button);
  const coaching: BaselineFeedback[] = [];
  for (const a of actions) {
    if (table.actor === 0) coaching.push(evaluateBaseline(table, a));
    table = act(table, a);
  }
  const mode = p.version === 1 ? "free" : p.mode;
  if (mode === "coached") {
    const expected = trainingTable(p.seed, p.hand - 1);
    if (
      p.button !== expected.button ||
      p.stacks.some((n: number) => n !== 200) ||
      JSON.stringify(actions.slice(0, expected.actions.length)) !==
        JSON.stringify(expected.actions)
    )
      throw new Error("Inconsistent coached setup");
  }
  if (!table.done && table.actor !== 0)
    throw new Error("Session is not at a player decision");
  return {
    mode,
    coaching,
    hand: p.hand,
    refills: p.refills,
    table,
  };
}

export function practiceReviewedDecision(
  s: SimulatorSession,
  id: number,
  index: number,
): SimulatorSession {
  const h = s.archive.find((h) => h.id === id);
  if (
    !h ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= h.record.actions.length
  )
    throw new Error("Review decision not found");
  const record = { ...h.record, actions: h.record.actions.slice(0, index) };
  const cursor = readCursor(record);
  if (cursor.table.done || cursor.table.actor !== 0)
    throw new Error("Choose one of your decisions to practice");
  return {
    ...s,
    ...cursor,
    practice: true,
    retryOf: null,
    resume: s.resume ?? {
      record: recordCursor(s),
      practice: s.practice,
      retryOf: s.retryOf,
    },
  };
}
