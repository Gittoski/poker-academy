import { expect, it } from 'vitest'
import {
  activityFrom,
  calendarWeeks,
  countAnswer,
  emptyActivity,
  localDay,
  validateActivity,
  activityLevel,
} from './calendar'
it('builds twelve Monday-first weeks with seven days across month/year boundaries', () => {
  const now = new Date(2027, 0, 2, 23, 50),
    weeks = calendarWeeks(now)
  expect(weeks).toHaveLength(12)
  expect(
    weeks.every(
      (w) => w.length === 7 && w[0].getDay() === 1 && w[6].getDay() === 0,
    ),
  ).toBe(true)
  expect(localDay(weeks.at(-1)![5])).toBe('2027-01-02')
  expect(new Set(weeks.flat().map(localDay)).size).toBe(84)
})
it('groups device-local calendar days, counts answers and bounds history', () => {
  let a = emptyActivity()
  const before = new Date(2026, 10, 15, 23, 59).getTime(),
    after = new Date(2026, 10, 16, 0, 1).getTime()
  a = countAnswer(countAnswer(countAnswer(a, before), after), after)
  expect(a.days).toEqual({ '2026-11-15': 1, '2026-11-16': 2 })
  const times = Array.from({ length: 500 }, (_, n) =>
    new Date(2025, 0, 1 + n, 12).getTime(),
  )
  const bounded = activityFrom(times)
  expect(Object.keys(bounded.days)).toHaveLength(400)
  expect(validateActivity(bounded)).toEqual(bounded)
  expect(Object.keys(bounded.days).sort().at(-1)).toBe(localDay(times.at(-1)!))
})
it('rejects malformed imported counters and uses stable documented color thresholds', () => {
  for (const days of [
    { '2026-02-30': 1 },
    { '2026-11-16': -1 },
    { '2026-11-16': 0.5 },
    { bad: 1 },
  ])
    expect(() => validateActivity({ version: 1, days })).toThrow()
  expect([0, 1, 4, 5, 14, 15, 29, 30].map(activityLevel)).toEqual([
    0, 1, 1, 2, 2, 3, 3, 4,
  ])
})
