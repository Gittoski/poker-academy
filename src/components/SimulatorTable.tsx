'use client'
import { useEffect, useId, useState, type ReactNode } from 'react'
import type { Card, HoleCards as Cards } from '@/lib/cards'
import {
  positionsFor,
  POSITION_LABELS,
  type PlayerCount,
  type Position,
} from '@/lib/positions'
import { HoleCards, BoardCards } from './HoleCards'
interface Props {
  players: PlayerCount
  hero: Position
  villain?: Position
  bets: Partial<Record<Position, number>>
  acting?: Position
  folded?: ReadonlySet<Position>
  labels?: Partial<Record<Position, string>>
  stacks?: Partial<Record<Position, number>>
  pot?: number
  cards: Cards
  board?: Card[]
  showdown?: ReactNode
  clickable?: ReadonlySet<Position>
  selected?: Position
  onSeatClick?: (position: Position) => void
}
const amount = (n: number) =>
  Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100)
/** Presentation only. Receives public state and hero cards; never reads opponent cards or chooses an action. */
export function SimulatorTable({
  players,
  hero,
  villain,
  bets,
  acting,
  folded,
  labels,
  stacks,
  pot,
  cards,
  board = [],
  showdown,
  clickable,
  selected,
  onSeatClick,
}: Props) {
  const id = useId(),
    [portrait, setPortrait] = useState(false),
    [compact, setCompact] = useState(false)
  useEffect(() => {
    const m = matchMedia('(max-width: 768px) and (orientation: portrait)')
    const short = matchMedia('(max-height: 700px)')
    const sync = () => {
      setPortrait(m.matches)
      setCompact(short.matches)
    }
    sync()
    m.addEventListener('change', sync)
    short.addEventListener('change', sync)
    return () => {
      m.removeEventListener('change', sync)
      short.removeEventListener('change', sync)
    }
  }, [])
  const W = portrait ? 400 : 680,
    H = portrait ? (compact ? 450 : 560) : 420,
    cx = W / 2,
    cy = portrait ? H / 2 - 5 : 210,
    rx = portrait ? 154 : 260,
    ry = portrait ? H / 2 - 74 : 140
  const order = positionsFor(players),
    start = order.indexOf(hero),
    seatWidth = players === 6 ? (portrait ? 84 : 92) : 70
  const seats = order.map((position, i) => {
    const angle =
      Math.PI / 2 +
      (((i - start + order.length) % order.length) * Math.PI * 2) / order.length
    return {
      position,
      angle,
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    }
  })
  const revealedSeat = seats.find((s) => s.position === villain)
  const heroY = cy + ry,
    heroCardY = heroY - 96
  return (
    <div
      className={`table-wrap navy-table${portrait ? ' navy-table--portrait' : ''}`}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label={`Table with ${players} players, hero ${hero}`}
      >
        <defs>
          <radialGradient id={`${id}-felt`} cx="48%" cy="40%" r="70%">
            <stop offset="0" stopColor="var(--poker-felt-light)" />
            <stop offset=".58" stopColor="var(--poker-felt)" />
            <stop offset="1" stopColor="var(--poker-felt-edge)" />
          </radialGradient>
          <linearGradient id={`${id}-rail`} x2=".2" y2="1">
            <stop stopColor="#3a404a" />
            <stop offset=".18" stopColor="#292e36" />
            <stop offset=".65" stopColor="#141921" />
            <stop offset="1" stopColor="#29313b" />
          </linearGradient>
          <linearGradient id={`${id}-seat`} x2=".1" y2="1">
            <stop stopColor="#353b46" />
            <stop offset=".45" stopColor="#232a34" />
            <stop offset="1" stopColor="#151b25" />
          </linearGradient>
          <linearGradient id={`${id}-back`} x2="1" y2="1">
            <stop stopColor="#354456" />
            <stop offset="1" stopColor="#182333" />
          </linearGradient>
          <pattern
            id={`${id}-weave`}
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="m0 1 4 4m-3-6 5 5"
              stroke="#dce9ff"
              strokeOpacity=".035"
              strokeWidth=".5"
            />
          </pattern>
          <pattern
            id={`${id}-card-pattern`}
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="m0 2 2-2 2 2-2 2Z"
              stroke="#b3c6df"
              strokeOpacity=".27"
              strokeWidth=".45"
              fill="none"
            />
          </pattern>
          <filter
            id={`${id}-shadow`}
            x="-45%"
            y="-45%"
            width="190%"
            height="210%"
          >
            <feDropShadow
              dx="0"
              dy="4"
              stdDeviation="4"
              floodColor="#000"
              floodOpacity=".55"
            />
          </filter>
        </defs>
        <ellipse
          className="navy-table__rail"
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={`url(#${id}-felt)`}
          stroke={`url(#${id}-rail)`}
          strokeWidth="22"
          filter={`url(#${id}-shadow)`}
        />
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx - 12}
          ry={ry - 12}
          fill="none"
          stroke="#000"
          strokeOpacity=".45"
          strokeWidth="5"
        />
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx - 14}
          ry={ry - 14}
          fill={`url(#${id}-weave)`}
        />
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx + 10}
          ry={ry + 10}
          fill="none"
          stroke="#a4adb9"
          strokeOpacity=".18"
          strokeWidth="1"
        />
        <text
          x={cx}
          y={board.length ? (portrait ? cy - 76 : 129) : cy - 12}
          textAnchor="middle"
          fill="#b9cce4"
          fontSize="10"
          fontWeight="600"
          letterSpacing="3"
        >
          POT
        </text>
        <text
          x={cx}
          y={board.length ? (portrait ? cy - 49 : 155) : cy + 12}
          textAnchor="middle"
          fill="#f5f8ff"
          fontSize="22"
          fontWeight="750"
        >
          {pot === undefined ? '—' : `${amount(pot)} BB`}
        </text>
        {board.length > 0 && (
          <foreignObject
            x={cx - 126}
            y={portrait ? cy - 31 : 166}
            width="252"
            height="76"
            className="table-board"
          >
            <BoardCards cards={board} />
          </foreignObject>
        )}
        <foreignObject
          x={cx - 62}
          y={heroCardY}
          width="124"
          height="100"
          className="table-hero-hand"
        >
          <HoleCards cards={cards} />
        </foreignObject>
        {showdown && (
          <foreignObject
            x={revealedSeat ? revealedSeat.x - 61 : portrait ? 274 : 480}
            y={
              revealedSeat
                ? revealedSeat.y < cy
                  ? Math.max(0, revealedSeat.y - 70)
                  : revealedSeat.y + 28
                : portrait
                  ? heroY - 49
                  : 310
            }
            width="122"
            height="90"
            className="table-showdown"
          >
            {showdown}
          </foreignObject>
        )}
        {seats.map(({ position, x, y, angle }) => {
          const isHero = position === hero,
            isFolded =
              (folded?.has(position) ?? false) ||
              /^(fold|folded)$/i.test(labels?.[position] ?? ''),
            isActing = position === acting,
            isSelected = position === selected,
            canInspect = !!onSeatClick && !!clickable?.has(position)
          const bet = bets[position],
            stack = stacks?.[position],
            caption = isFolded
              ? 'Folded'
              : stack !== undefined
                ? `${amount(stack)} BB`
                : (labels?.[position] ?? (isHero ? 'YOU' : 'In hand'))
          const bx = isHero ? cx - 88 : cx + rx * 0.7 * Math.cos(angle),
            by = isHero ? heroY - 30 : cy + ry * 0.7 * Math.sin(angle)
          return (
            <g
              key={position}
              className={`seat${isHero ? ' seat--hero' : ''}${isActing ? ' seat--acting' : ''}${canInspect ? ' seat--clickable' : ''}`}
              opacity={isFolded && !isSelected ? 0.62 : 1}
              role={canInspect ? 'button' : undefined}
              tabIndex={canInspect ? 0 : undefined}
              aria-label={
                canInspect
                  ? `Show ${POSITION_LABELS[position]} range`
                  : undefined
              }
              aria-pressed={canInspect ? isSelected : undefined}
              onClick={canInspect ? () => onSeatClick(position) : undefined}
              onKeyDown={
                canInspect
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSeatClick(position)
                      }
                    }
                  : undefined
              }
            >
              {!isHero && !isFolded && !(showdown && position === villain) && (
                <g aria-hidden="true" filter={`url(#${id}-shadow)`}>
                  {[-1, 1].map((side) => (
                    <g
                      key={side}
                      transform={`translate(${x + side * 9},${y - 29}) rotate(${side * 9})`}
                    >
                      <rect
                        x="-14"
                        y="-22"
                        width="28"
                        height="38"
                        rx="3"
                        fill={`url(#${id}-back)`}
                        stroke="#8292a9"
                        strokeWidth="1"
                      />
                      <rect
                        x="-12"
                        y="-20"
                        width="24"
                        height="34"
                        rx="2"
                        fill={`url(#${id}-card-pattern)`}
                      />
                    </g>
                  ))}
                </g>
              )}
              {isActing && (
                <rect
                  x={x - seatWidth / 2 - 3}
                  y={y - 27}
                  width={seatWidth + 6}
                  height="54"
                  rx="13"
                  fill="none"
                  stroke="#b4d4ff"
                  strokeWidth="1.4"
                  className="seat-pulse"
                />
              )}
              {canInspect && (
                <rect
                  x={x - seatWidth / 2 - 3}
                  y={y - 42}
                  width={seatWidth + 6}
                  height="84"
                  rx="12"
                  fill="transparent"
                />
              )}
              <rect
                className="seat-surface"
                x={x - seatWidth / 2}
                y={y - 24}
                width={seatWidth}
                height="48"
                rx="10"
                fill={`url(#${id}-seat)`}
                stroke={
                  isHero
                    ? '#7abaff'
                    : isSelected
                      ? '#e9f2ff'
                      : position === villain
                        ? '#8997ab'
                        : '#647080'
                }
                strokeWidth={isHero ? 1.8 : 1}
                filter={`url(#${id}-shadow)`}
              />
              <path
                d={`M${x - seatWidth / 2 + 11} ${y - 22}H${x + seatWidth / 2 - 11}`}
                stroke="#f4f7ff"
                strokeOpacity=".12"
              />
              <text
                x={x}
                y={y - 5}
                textAnchor="middle"
                fontSize={players === 6 ? 14 : 12}
                fontWeight="700"
                fill="#f7f9ff"
              >
                {POSITION_LABELS[position]}
              </text>
              <text
                x={x}
                y={y + 13}
                textAnchor="middle"
                className="seat-caption"
                fontSize={players === 6 ? 11 : 9}
                fontWeight="500"
                fill={isHero ? '#c0ddff' : '#c5cfdd'}
              >
                {caption}
              </text>
              {position === 'BTN' && (
                <g>
                  <circle
                    cx={x + seatWidth / 2 + 14}
                    cy={y + 4}
                    r="9"
                    fill="#f1f5fa"
                    stroke="#9aa7b6"
                  />
                  <text
                    x={x + seatWidth / 2 + 14}
                    y={y + 7.5}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="750"
                    fill="#18202d"
                  >
                    D
                  </text>
                </g>
              )}
              {bet !== undefined && bet > 0 && (
                <g
                  role="img"
                  aria-label={`${POSITION_LABELS[position]} committed ${amount(bet)} BB`}
                >
                  <circle
                    cx={bx + 1}
                    cy={by + 3}
                    r="7"
                    fill="#000"
                    opacity=".35"
                  />
                  <circle
                    cx={bx}
                    cy={by}
                    r="7"
                    fill={position === 'SB' ? '#b95750' : '#3983c8'}
                    stroke="#d3e4f5"
                    strokeWidth="1"
                  />
                  <circle
                    cx={bx}
                    cy={by}
                    r="5.5"
                    fill="none"
                    stroke="#f4f8ff"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                  <circle cx={bx} cy={by} r="3" fill="#243956" />
                  <text
                    x={bx - 11}
                    y={by + 4}
                    textAnchor="end"
                    fontSize="11"
                    fontWeight="650"
                    fill="#eff5ff"
                  >
                    {amount(bet)}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
