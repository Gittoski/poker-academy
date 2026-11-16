/** Answer volume, never an accuracy or mastery score. Calendar keys use device-local days. */
export interface Activity {
  version: 1
  days: Record<string, number>
}
export const emptyActivity = (): Activity => ({ version: 1, days: {} })
export function localDay(at: number | Date): string {
  const d = new Date(at)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function countAnswer(activity: Activity, at: number): Activity {
  if (!Number.isFinite(at) || at < 0) throw Error('Invalid activity time')
  const day = localDay(at),
    days = { ...activity.days }
  days[day] = (days[day] ?? 0) + 1
  // Bounded independently of detailed attempts; over a year of active days.
  for (const key of Object.keys(days).sort().slice(0, -400)) delete days[key]
  return { version: 1, days }
}
export function activityFrom(times: number[]): Activity {
  return times.sort((a, b) => a - b).reduce(countAnswer, emptyActivity())
}
export function validateActivity(value: unknown): Activity {
  const a = value as Activity
  if (
    !a ||
    a.version !== 1 ||
    !a.days ||
    Array.isArray(a.days) ||
    typeof a.days !== 'object' ||
    Object.keys(a.days).length > 400
  )
    throw Error('Invalid daily activity')
  for (const [key, n] of Object.entries(a.days)) {
    const date = new Date(`${key}T12:00:00`)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(key) ||
      !Number.isFinite(date.getTime()) ||
      localDay(date) !== key ||
      !Number.isSafeInteger(n) ||
      n < 0
    )
      throw Error('Invalid daily activity')
  }
  return a
}
export function activityLevel(n: number): number {
  return n === 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 30 ? 3 : 4
}
export function calendarWeeks(now: Date): Date[][] {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - 77)
  return Array.from({ length: 12 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + week * 7 + day)
      return d
    }),
  )
}
