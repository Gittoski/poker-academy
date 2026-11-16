'use client'
import { useState } from 'react'
import {
  activityLevel,
  calendarWeeks,
  localDay,
  type Activity,
} from '@/activity/calendar'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export function ActivityGrid({
  activity,
  now,
  available,
}: {
  activity: Activity
  now: Date
  available: boolean
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const today = localDay(now),
    weeks = calendarWeeks(now),
    day = selected ?? today
  const count = activity.days[day] ?? 0
  return (
    <section
      className="home-panel home-activity"
      aria-labelledby="activity-title"
    >
      <div className="home-section-head">
        <h2 id="activity-title">Your activity</h2>
        <span>Last 12 weeks</span>
      </div>
      <div
        className="activity-calendar"
        aria-label="Answered training decisions and practice questions"
      >
        <div className="activity-weekdays" aria-hidden="true">
          <span />
          {DAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        {weeks.map((week, index) => (
          <div className="activity-week" key={localDay(week[0])}>
            <span className="activity-month" aria-hidden="true">
              {index === 0 ||
              week[0].getMonth() !== weeks[index - 1][0].getMonth()
                ? week[0].toLocaleDateString('en', { month: 'short' })
                : ''}
            </span>
            {week.map((date) => {
              const key = localDay(date),
                n = activity.days[key] ?? 0
              const label = `${date.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}: ${n} answered`
              return (
                <button
                  key={key}
                  className={`activity-day activity-level-${available ? activityLevel(n) : 0}`}
                  disabled={key > today || !available}
                  aria-label={label}
                  aria-pressed={day === key}
                  title={label}
                  onClick={() => setSelected(key)}
                  data-day={key}
                  data-count={n}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="activity-footer">
        <p role="status">
          {available ? (
            <>
              <strong>{count}</strong> answered{' '}
              {day === today
                ? 'today'
                : `on ${new Date(`${day}T12:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`}
            </>
          ) : (
            'Activity unavailable'
          )}
        </p>
        <div
          className="activity-legend"
          aria-label="Color levels: 0, 1 to 4, 5 to 14, 15 to 29, and 30 or more answers"
        >
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((n) => (
            <i key={n} className={`activity-day activity-level-${n}`} />
          ))}
          <span>More</span>
        </div>
      </div>
      <p className="activity-note">
        Answers include retries. Older history may be incomplete.
      </p>
    </section>
  )
}
