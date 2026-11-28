/**
 * Drag items from the tray into slots, or tap: tapping a tray item drops it in the first empty
 * slot, tapping a placed item sends it back. Dragging onto a filled slot swaps the two. Works
 * with touch, mouse and keyboard (every item is a button).
 *
 * Layouts: 'list' stacks numbered slots; 'plug' draws an RJ45 plug with pins 1-8 side by side
 * and the items as coloured wires (colours from core/cabling).
 */
import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react'
import { WIRE, isWireColour } from '../../core/cabling'
import { Facts } from './Facts'
import type { OrderQuestion, OrderResponse } from './order'
import { Prompt } from './Prompt'
import type { QuestionViewProps } from './types'
import { Visuals } from './VisualsView'

type Slots = (string | null)[]

/** How far the pointer must move before a press counts as a drag, in px. */
const DRAG_THRESHOLD = 8

function WireSwatch({ item }: { item: string }) {
  if (!isWireColour(item)) return null
  const w = WIRE[item]
  return (
    <span className={`wire wire-${w.pair}${w.striped ? ' is-striped' : ''}`} aria-hidden="true" />
  )
}

export function OrderView({
  question,
  response,
  check,
  onAnswer,
  hintsAllowed,
}: QuestionViewProps<OrderQuestion, OrderResponse>) {
  const n = question.answer.length
  const [slots, setSlots] = useState<Slots>(() => Array<string | null>(n).fill(null))
  const [drag, setDrag] = useState<{ item: string; x: number; y: number } | null>(null)
  const press = useRef<{
    item: string
    from: number | 'tray'
    x: number
    y: number
    moved: boolean
  } | null>(null)
  const answered = response !== null
  const shown: Slots = answered ? question.answer.map((_, i) => response[i] ?? null) : slots
  const tray = question.items.filter((it) => !shown.includes(it))
  const parts = check?.parts ?? []
  const plug = question.layout === 'plug'
  const label = (i: number) => question.slotLabels?.[i] ?? String(i + 1)

  /** Put `item` into slot `to`; whatever was there goes where `item` came from. */
  const place = (item: string, from: number | 'tray', to: number) => {
    setSlots((s) => {
      const next = [...s]
      const displaced = next[to] ?? null
      if (from !== 'tray') next[from] = displaced
      next[to] = item
      return next
    })
  }
  const toTray = (from: number) => setSlots((s) => s.map((x, i) => (i === from ? null : x)))

  const onTap = (item: string, from: number | 'tray') => {
    if (from === 'tray') {
      const empty = slots.indexOf(null)
      if (empty >= 0) place(item, 'tray', empty)
    } else toTray(from)
  }

  const onPointerDown = (e: ReactPointerEvent, item: string, from: number | 'tray') => {
    if (answered) return
    press.current = { item, from, x: e.clientX, y: e.clientY, moved: false }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    const p = press.current
    if (!p) return
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_THRESHOLD) return
    p.moved = true
    setDrag({ item: p.item, x: e.clientX - p.x, y: e.clientY - p.y })
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    const p = press.current
    press.current = null
    setDrag(null)
    if (!p) return
    if (!p.moved) {
      onTap(p.item, p.from)
      return
    }
    // Which slot (or the tray) is under the finger?
    const under = document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((el) => el instanceof HTMLElement && el.dataset.slot !== undefined) as
      HTMLElement | undefined
    if (under?.dataset.slot === 'tray') {
      if (p.from !== 'tray') toTray(p.from)
    } else if (under) place(p.item, p.from, Number(under.dataset.slot))
  }

  const dragStyle = (item: string) =>
    drag?.item === item
      ? {
          transform: `translate(${drag.x}px, ${drag.y}px)`,
          zIndex: 2,
          position: 'relative' as const,
        }
      : undefined

  const itemButton = (item: string, from: number | 'tray', extraLabel: string) => (
    <button
      type="button"
      className={`order-item${plug ? ' is-wire' : ''}${drag?.item === item ? ' is-dragging' : ''}`}
      style={dragStyle(item)}
      disabled={answered}
      aria-label={`${item}${extraLabel}`}
      onPointerDown={(e) => onPointerDown(e, item, from)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        press.current = null
        setDrag(null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTap(item, from)
        }
      }}
    >
      {plug && <WireSwatch item={item} />}
      <span className="order-item-text">
        {plug && isWireColour(item) ? WIRE[item].short : item}
      </span>
    </button>
  )

  const full = tray.length === 0

  return (
    <div className="order-q">
      <Prompt
        text={question.prompt}
        hint={question.hint}
        hintsAllowed={hintsAllowed && !answered}
      />
      {question.facts && <Facts facts={question.facts} />}
      <Visuals visuals={question.visuals} />

      <ol className={plug ? 'order-plug' : 'order-seq'} aria-label="Your order">
        {shown.map((item, i) => {
          const part = parts[i]
          const state = part ? (part.correct ? 'is-right' : 'is-wrong') : item ? 'is-set' : ''
          return (
            <li key={i} className={`order-slot ${state}`} data-slot={i}>
              <span className="order-n">{plug ? i + 1 : label(i)}</span>
              {item ? (
                itemButton(item, i, ` in ${label(i)}${answered ? '' : ' (tap to take out)'}`)
              ) : (
                <span className="order-empty" aria-label={`${label(i)}: empty`}>
                  {plug ? '' : '…'}
                </span>
              )}
              {part && !part.correct && (
                <span className="mark">
                  {plug && isWireColour(part.expected)
                    ? `✗ ${WIRE[part.expected].short}`
                    : `✗ should be: ${part.expected}`}
                </span>
              )}
            </li>
          )
        })}
      </ol>
      {plug && answered && (
        <p className="order-legend">{question.answer.map((c, i) => `${i + 1} ${c}`).join(' · ')}</p>
      )}

      {!answered && (
        <>
          <div className="order-pool" role="group" aria-label="Items to place" data-slot="tray">
            {tray.length === 0 ? (
              <span className="order-pool-empty">All placed. Tap one to take it out.</span>
            ) : (
              tray.map((it) => itemButton(it, 'tray', ' (tap to place)'))
            )}
          </div>
          <div className="keypad-actions">
            <button
              type="button"
              className="btn-secondary"
              disabled={slots.every((x) => x === null)}
              onClick={() => setSlots(Array<string | null>(n).fill(null))}
            >
              Clear
            </button>
            <button
              type="button"
              disabled={!full}
              onClick={() => onAnswer(slots.map((x) => x ?? ''))}
            >
              {full ? 'Check answer' : `Place ${tray.length} more`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
