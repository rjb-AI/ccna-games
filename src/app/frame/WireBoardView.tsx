/**
 * The wire board: loose wires hang from the bottom; drag a wire's end up and drop it on a
 * connector to plug it in. Wires are drawn as curved cables, so a wrong order looks tangled and
 * the right order runs straight. Dropping on a used connector pops the old wire out. Tap a
 * plugged wire to pull it out. Keyboard: Tab to a wire end, press 1-8 to plug it into that
 * connector, 0 or Backspace to pull it out.
 */
import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react'
import { Prompt } from './Prompt'
import { Visuals } from './VisualsView'
import type { QuestionViewProps } from './types'
import type { WiresQuestion, WiresResponse } from './wires'

// Board coordinates (SVG units; the SVG scales to the screen width).
const W = 360
const H = 500
const PIN_Y = 92
const ROOT_Y = 432
const REST_Y = 330
const SNAP = 34

type Plugs = Record<string, string> // target id -> source id

export function WireBoardView({
  question: q,
  response,
  check,
  onAnswer,
  hintsAllowed,
}: QuestionViewProps<WiresQuestion, WiresResponse>) {
  const answered = response !== null
  const [plugs, setPlugs] = useState<Plugs>({})
  const [drag, setDrag] = useState<{ source: string; x: number; y: number } | null>(null)
  const press = useRef<{ source: string; x: number; y: number; moved: boolean } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const shown: Plugs = answered ? { ...response } : plugs
  const parts = check?.parts ?? []

  const n = q.targets.length
  const pinX = (i: number) => 60 + (i + 0.5) * (240 / n)
  const rootX = (j: number) => 32 + j * ((W - 64) / Math.max(1, q.sources.length - 1))
  const targetOf = (source: string) => Object.keys(shown).find((t) => shown[t] === source) ?? null

  /** Where a wire's end is drawn. */
  const endOf = (source: string, j: number) => {
    if (drag?.source === source) return { x: drag.x, y: drag.y }
    const t = targetOf(source)
    if (t) return { x: pinX(q.targets.findIndex((x) => x.id === t)), y: PIN_Y + 18 }
    // Loose ends stand at two heights so every handle has its own 48px of space.
    return { x: rootX(j), y: REST_Y - (j % 2) * 60 }
  }

  const toBoard = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: Math.max(0, Math.min(W, p.x)), y: Math.max(0, Math.min(H, p.y)) }
  }

  const plug = (source: string, target: string | null) =>
    setPlugs((p) => {
      const next: Plugs = {}
      for (const [t, s] of Object.entries(p)) if (s !== source && t !== target) next[t] = s
      if (target) next[target] = source
      return next
    })

  const onDown = (e: ReactPointerEvent, source: string) => {
    if (answered) return
    press.current = { source, ...toBoard(e), moved: false }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: ReactPointerEvent) => {
    const p = press.current
    if (!p) return
    const at = toBoard(e)
    if (!p.moved && Math.hypot(at.x - p.x, at.y - p.y) < 6) return
    p.moved = true
    setDrag({ source: p.source, ...at })
  }
  const onUp = (e: ReactPointerEvent) => {
    const p = press.current
    press.current = null
    setDrag(null)
    if (!p) return
    if (!p.moved) {
      // A tap pulls a plugged wire out; on a loose wire it plugs into the first free pin.
      if (targetOf(p.source)) plug(p.source, null)
      else {
        const free = q.targets.find((t) => !shown[t.id])
        if (free) plug(p.source, free.id)
      }
      return
    }
    const at = toBoard(e)
    const near = q.targets
      .map((t, i) => ({ t, d: Math.hypot(at.x - pinX(i), at.y - (PIN_Y + 18)) }))
      .sort((a, b) => a.d - b.d)[0]
    plug(p.source, near && (near.d < SNAP || at.y < PIN_Y + 50) ? near.t.id : null)
  }

  const full = q.targets.every((t) => shown[t.id])

  return (
    <div className="wires-q">
      <Prompt text={q.prompt} hint={q.hint} hintsAllowed={hintsAllowed && !answered} />
      <Visuals visuals={q.visuals} />
      <svg
        ref={svgRef}
        className="wire-board"
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label="Wire board: drag each wire to its pin"
      >
        {/* The plug body and its pins. */}
        <rect className="plug-body" x={48} y={24} width={264} height={110} rx={10} />
        <rect className="plug-latch" x={150} y={8} width={60} height={20} rx={4} />
        {q.targets.map((t, i) => {
          const part = parts.find((p) => p.id === t.id)
          const state = part
            ? part.correct
              ? ' is-right'
              : ' is-wrong'
            : shown[t.id]
              ? ' is-set'
              : ''
          return (
            <g key={t.id}>
              <rect
                className={`plug-pin${state}`}
                x={pinX(i) - 11}
                y={36}
                width={22}
                height={72}
                rx={3}
              />
              <text className="pin-label" x={pinX(i)} y={64} textAnchor="middle">
                {i + 1}
              </text>
              {part && (
                <text
                  className={`pin-mark${part.correct ? ' is-right' : ' is-wrong'}`}
                  x={pinX(i)}
                  y={158}
                  textAnchor="middle"
                >
                  {part.correct ? '✓' : '✗'}
                </text>
              )}
            </g>
          )
        })}

        {/* Wires: drawn back to front, the one being dragged on top. */}
        {[...q.sources]
          .map((s, j) => ({ s, j }))
          .sort((a, b) => Number(drag?.source === a.s.id) - Number(drag?.source === b.s.id))
          .map(({ s, j }) => {
            const x0 = rootX(j)
            const end = endOf(s.id, j)
            const d = `M ${x0} ${ROOT_Y} C ${x0} ${ROOT_Y - 120}, ${end.x} ${end.y + 130}, ${end.x} ${end.y}`
            const plugged = targetOf(s.id)
            return (
              <g key={s.id} className={`wire-g wire-${s.colour}`}>
                <path className="wire-line" d={d} />
                {s.striped && <path className="wire-stripe" d={d} />}
                <rect
                  className="wire-tip"
                  x={end.x - 9}
                  y={end.y - 10}
                  width={18}
                  height={22}
                  rx={3}
                />
                {/* Big invisible handle: at least 48px to grab with a thumb. */}
                <circle
                  className="wire-handle"
                  cx={end.x}
                  cy={end.y}
                  r={26}
                  tabIndex={answered ? -1 : 0}
                  role="button"
                  aria-label={`${s.label} wire${plugged ? `, in ${q.targets.find((t) => t.id === plugged)?.label}` : ', loose'}`}
                  onPointerDown={(e) => onDown(e, s.id)}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={() => {
                    press.current = null
                    setDrag(null)
                  }}
                  onKeyDown={(e) => {
                    if (answered) return
                    const k = Number(e.key)
                    if (e.key >= '1' && e.key <= String(n)) plug(s.id, q.targets[k - 1]?.id ?? null)
                    else if (e.key === '0' || e.key === 'Backspace') plug(s.id, null)
                  }}
                />
                {/* Labels on two staggered rows so neighbours never overlap. */}
                <text
                  className="wire-label"
                  x={x0}
                  y={ROOT_Y + 28 + (j % 2) * 28}
                  textAnchor="middle"
                >
                  {s.label}
                </text>
              </g>
            )
          })}
      </svg>
      {answered && (
        <p className="order-legend">
          Right order:{' '}
          {q.targets
            .map(
              (t) =>
                `${t.label.replace('Pin ', '')} ${q.sources.find((s) => s.id === q.answer[t.id])?.label}`,
            )
            .join(' · ')}
        </p>
      )}
      {!answered && (
        <div className="keypad-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={Object.keys(plugs).length === 0}
            onClick={() => setPlugs({})}
          >
            Unplug all
          </button>
          <button type="button" disabled={!full} onClick={() => onAnswer(plugs)}>
            {full ? 'Check answer' : `${q.targets.length - Object.keys(plugs).length} pins empty`}
          </button>
        </div>
      )}
    </div>
  )
}
