import { useId } from 'react'
import {
  POSITION_LABELS,
  positionsFor,
  type PlayerCount,
  type Position,
} from '@/lib/positions'

interface Props {
  players: PlayerCount
  hero: Position
  villain?: Position
  bets: Partial<Record<Position, number>>
  /** Seat whose turn it is, drawn with a pulsing ring. */
  acting?: Position
  /** Seats that have folded, drawn dimmed. */
  folded?: ReadonlySet<Position>
  /** Short text under each seat, e.g. the seat's last action or revealed hand. */
  labels?: Partial<Record<Position, string>>
  /** Pot size shown in the middle of the table. */
  pot?: number
  /** Seats that can be clicked to inspect them. */
  clickable?: ReadonlySet<Position>
  /** Seat currently being inspected, drawn with a dashed ring. */
  selected?: Position
  onSeatClick?: (position: Position) => void
}

const W = 480
const H = 340
const CX = W / 2
const CY = H / 2
const RX = 196
const RY = 112

function chipColor(position: Position, amount: number): string {
  if (position === 'SB' && amount === 0.5) return '#e04b4b'
  if (position === 'BB' && amount === 1) return '#3b6fd8'
  return '#8e8e96'
}

function formatBet(amount: number): string {
  return Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(1).replace(/\.0$/, '')
}

export function TableDiagram({
  players,
  hero,
  villain,
  bets,
  acting,
  folded,
  labels,
  pot,
  clickable,
  selected,
  onSeatClick,
}: Props) {
  const gradientId = useId()
  const order = positionsFor(players)
  const heroIdx = order.indexOf(hero)
  const seats = order.map((position, i) => {
    const k = (i - heroIdx + order.length) % order.length
    const angle = Math.PI / 2 + (k * 2 * Math.PI) / order.length
    return {
      position,
      angle,
      x: CX + RX * Math.cos(angle),
      y: CY + RY * Math.sin(angle),
    }
  })

  return (
    <div className="table-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Table with ${players} players, hero ${hero}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--seat-top)" />
            <stop offset="100%" stopColor="var(--seat-bottom)" />
          </linearGradient>
        </defs>
        <ellipse
          className="table-surface"
          cx={CX}
          cy={CY}
          rx={RX}
          ry={RY}
          fill="var(--table-fill)"
          stroke="var(--table-rail)"
          strokeWidth={2}
        />
        <text
          x={CX}
          y={pot === undefined ? CY + 4 : CY - 78}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          letterSpacing={2}
          fill="var(--muted)"
        >
          {pot === undefined ? 'PREFLOP' : 'POT'}
        </text>
        {pot !== undefined && (
          <text
            x={CX}
            y={CY - 51}
            textAnchor="middle"
            fontSize={21}
            fontWeight={700}
            fill="var(--text)"
          >
            {formatBet(pot)} BB
          </text>
        )}
        {seats.map(({ position, angle, x, y }) => {
          const isHero = position === hero
          const isVillain = position === villain
          const isFolded = folded?.has(position) ?? false
          const isClickable =
            (clickable?.has(position) ?? false) && !!onSeatClick
          const isSelected = position === selected
          const label = labels?.[position]
          const bet = bets[position]
          const labelBelow = Math.sin(angle) >= 0
          const bx = CX + RX * 0.7 * Math.cos(angle)
          const by = CY + RY * 0.68 * Math.sin(angle)
          const dx = CX + RX * 0.86 * Math.cos(angle - 0.55)
          const dy = CY + RY * 0.84 * Math.sin(angle - 0.55)
          return (
            <g
              key={position}
              opacity={isFolded && !isSelected ? 0.55 : 1}
              className={`seat${isClickable ? ' seat--clickable' : ''}${isHero ? ' seat--hero' : ''}${position === acting ? ' seat--acting' : ''}`}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              aria-label={
                isClickable
                  ? `Show ${POSITION_LABELS[position]} range`
                  : undefined
              }
              aria-pressed={isClickable ? isSelected : undefined}
              onClick={isClickable ? () => onSeatClick(position) : undefined}
              onKeyDown={
                isClickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSeatClick(position)
                      }
                    }
                  : undefined
              }
            >
              {isClickable && (
                <rect
                  x={x - 40}
                  y={y - 40}
                  width={80}
                  height={80}
                  rx={16}
                  fill="transparent"
                />
              )}
              {position === acting && (
                <rect
                  x={x - 41}
                  y={y - 27}
                  width={82}
                  height={54}
                  rx={15}
                  fill="none"
                  stroke="var(--focus)"
                  strokeWidth={1.5}
                  className="seat-pulse"
                />
              )}
              {isSelected && (
                <rect
                  x={x - 41}
                  y={y - 27}
                  width={82}
                  height={54}
                  rx={15}
                  fill="none"
                  stroke="var(--text)"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              )}
              <rect
                className="seat-surface"
                x={x - 37}
                y={y - 23}
                width={74}
                height={46}
                rx={12}
                fill={`url(#${gradientId})`}
                stroke={
                  position === acting
                    ? 'var(--focus)'
                    : isHero
                      ? 'var(--accent)'
                      : isVillain
                        ? 'var(--seat-opponent)'
                        : 'var(--border)'
                }
                strokeWidth={isHero || position === acting ? 2 : 1.2}
              />
              <text
                x={x}
                y={isHero ? y - 2 : y + 4}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill="var(--text)"
              >
                {POSITION_LABELS[position]}
              </text>
              {isHero && (
                <text
                  x={x}
                  y={y + 13}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  letterSpacing={1.2}
                  fill="var(--focus)"
                >
                  YOU
                </text>
              )}
              {label && (
                <text
                  x={x}
                  y={labelBelow ? y + 39 : y - 33}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={isFolded ? 'var(--muted)' : 'var(--text)'}
                >
                  {label}
                </text>
              )}
              {position === 'BTN' && (
                <g>
                  <circle cx={dx} cy={dy} r={8} fill="#f2f4f8" />
                  <text
                    x={dx}
                    y={dy + 3.5}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={700}
                    fill="#171b24"
                  >
                    D
                  </text>
                </g>
              )}
              {bet !== undefined && (
                <g>
                  <text
                    x={bx - 7}
                    y={by + 4}
                    textAnchor="end"
                    fontSize={11}
                    fontWeight={600}
                    fill="var(--text)"
                  >
                    {formatBet(bet)}
                  </text>
                  <circle
                    cx={bx + 2}
                    cy={by}
                    r={6}
                    fill={chipColor(position, bet)}
                    stroke="#fff"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
