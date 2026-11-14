import type { JournalRuntime } from './runtime'
export function LearningFeedback({ journal }: { journal: JournalRuntime }) {
  const verdict = journal.feedback
  if (!verdict) return null
  const adaptive = journal.active?.origin === 'adaptive' && verdict.targeted
  if (verdict.learning.kind === 'match' && !adaptive) return null
  return (
    <span className="learning-review-note">
      {verdict.learning.kind === 'outside'
        ? 'Mistake review is automatic. Check the session indicator for save status.'
        : verdict.learning.kind === 'alternative'
          ? 'Supported alternatives stay out of the mistake queue.'
          : verdict.learning.kind === 'ungraded'
            ? 'This ungraded choice is not added as a mistake.'
            : ''}
      {adaptive && (
        <span>
          {' '}
          Review from an earlier session.{' '}
          {journal.active?.target?.variant === 'related'
            ? 'A different covered example of the same reference family.'
            : 'Your original missed situation.'}
        </span>
      )}
    </span>
  )
}
