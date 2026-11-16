'use client'
import { useId } from 'react'
import type { GameMode } from '@/lib/gameModes'

/** One native-feeling switch for the two existing modes; no game logic here. */
export function GameModeSwitch({
  mode,
  disabled,
  onChange,
}: {
  mode: GameMode
  disabled: boolean
  onChange: (mode: GameMode) => void
}) {
  const description = useId(),
    preflop = mode === 'preflop'
  return (
    <div className={`sim-mode${preflop ? ' sim-mode--preflop' : ''}`}>
      <span
        className="sim-mode__label sim-mode__label--full"
        aria-hidden="true"
      >
        Full hands
      </span>
      <button
        type="button"
        role="switch"
        className="sim-mode__switch"
        aria-label="Preflop mode"
        aria-checked={preflop}
        aria-describedby={description}
        disabled={disabled}
        onClick={() => onChange(preflop ? 'full-hands' : 'preflop')}
      >
        <span className="sim-mode__track" aria-hidden="true">
          <span className="sim-mode__thumb" />
        </span>
      </button>
      <span
        className="sim-mode__label sim-mode__label--preflop"
        aria-hidden="true"
      >
        Preflop
      </span>
      <span className="sim-mode__description" id={description}>
        Off: full hands. On: preflop only. Each mode keeps its saved hand.
      </span>
    </div>
  )
}
