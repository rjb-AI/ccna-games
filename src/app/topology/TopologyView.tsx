/**
 * Draws a topology as SVG. Sizes come from layout.ts: `u` is one CSS pixel at the drawing's
 * natural width, every label is 20 CSS px there, and the drawing fits a phone wherever it can
 * (ports whose names don't fit become dots).
 *
 * Every switch, router and port is tappable: a tap shows what it is in the line under the
 * drawing ("SW-B Gi0/2 to SW-C Gi0/1 · 1G·4"), so nothing is lost when names are dots. In pick
 * mode (tap-to-answer questions) a tap on one of the options also picks it.
 */
import { useState } from 'react'
import type { TopologyVisual } from '../frame/visuals'
import {
  BADGE_PX,
  FIT_PX,
  type PortMark,
  RING_H_PX,
  badgeAt,
  layoutTopology,
  portId,
  ringPx,
} from './layout'
import './topology.css'

export interface TopologyPick {
  /** What can be picked: device ids, or port ids ("device:port"). */
  options: readonly string[]
  picked: string | null
  /** After checking: right/wrong per option id. */
  marks?: Readonly<Record<string, 'right' | 'wrong'>>
  disabled?: boolean
  onPick(id: string): void
}

/** Labels drawn on the diagram: each badge cycles through the options when tapped. */
export interface TopologyAssign {
  /** Hotspot id (device id or "device:port") -> the item it labels. */
  anchors: Readonly<Record<string, string>>
  /** Current option per item (missing = not set). */
  values: Readonly<Record<string, string>>
  /** Short badge text per option, e.g. "R" for Root. */
  codes: Readonly<Record<string, string>>
  /** After checking: right/wrong per item. */
  marks?: Readonly<Record<string, 'right' | 'wrong'>>
  disabled?: boolean
  onTap(item: string): void
}

/** Half the size of a tap target, in CSS px (targets are 48px or more). */
const HIT_PX = 24

export function TopologyView({
  v,
  pick,
  assign,
}: {
  v: TopologyVisual
  pick?: TopologyPick
  assign?: TopologyAssign
}) {
  const layout = layoutTopology(v)
  const {
    u,
    font,
    boxH,
    boxW,
    links,
    minX,
    minY,
    W,
    H,
    naturalWidth,
    topology: t,
    compact,
    linksHidden,
  } = layout
  const notes = v.deviceNotes ?? {}
  const wide = naturalWidth > FIT_PX + 1
  const [inspect, setInspect] = useState<string | null>(null)
  const label = (id: string) => t.devices.find((d) => d.id === id)?.label ?? id

  /** What the info line says about a device or port. */
  const describe = (id: string): string => {
    if (!id.includes(':')) return `${label(id)}${notes[id] ? ` · ${notes[id]}` : ''}`
    const g = links.find((x) => x.ports.some((p) => portId(p.ep) === id))
    if (!g) return id
    const [here, far] = portId(g.l.a) === id ? [g.l.a, g.l.b] : [g.l.b, g.l.a]
    const extra = v.linkLabels?.[g.l.id]
    return `${label(here.device)} ${here.port} to ${label(far.device)} ${far.port}${extra ? ` · ${extra}` : ''}`
  }

  const tap = (id: string) => {
    setInspect(id)
    if (pick && !pick.disabled && pick.options.includes(id)) pick.onPick(id)
    const item = assign?.anchors[id]
    if (assign && item && !assign.disabled) assign.onTap(item)
  }
  /** A label badge at `at` for hotspot `id`. */
  const badge = (id: string, at: { x: number; y: number }) => {
    const item = assign?.anchors[id]
    if (!assign || !item) return null
    const value = assign.values[item]
    const mark = assign.marks?.[item]
    const r = (BADGE_PX / 2) * u
    return (
      <g
        key={`badge-${id}`}
        className={`topo-badge${value ? ' is-set' : ''}${mark ? ` is-${mark}` : ''}`}
        role="button"
        tabIndex={assign.disabled ? -1 : 0}
        aria-label={`${describe(id)}: ${value ?? 'not set'}${assign.disabled ? '' : ' (tap to change)'}`}
        onClick={() => tap(id)}
        onKeyDown={keyTap(id)}
      >
        <circle cx={at.x} cy={at.y} r={Math.max(r, HIT_PX * u)} className="topo-badge-hit" />
        <circle cx={at.x} cy={at.y} r={r} strokeWidth={3 * u} className="topo-badge-disc" />
        <text x={at.x} y={at.y} fontSize={font} dominantBaseline="central" textAnchor="middle">
          {value ? (assign.codes[value] ?? value) : '?'}
        </text>
        {mark && (
          <text
            x={at.x + r * 1.2}
            y={at.y - r * 1.1}
            fontSize={font}
            dominantBaseline="central"
            textAnchor="middle"
            className="topo-badge-mark"
          >
            {mark === 'right' ? '✓' : '✗'}
          </text>
        )}
      </g>
    )
  }
  const pickClass = (id: string) => {
    if (!pick?.options.includes(id)) return ''
    const mark = pick.marks?.[id]
    return ` is-option${pick.picked === id ? ' is-picked' : ''}${mark ? ` is-${mark}` : ''}`
  }
  const keyTap = (id: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      tap(id)
    }
  }
  const interactive = !!v.showPorts || !!pick || linksHidden || !!assign

  // Port, link and note labels use the same size as device names: nothing under 20 px.
  const portMark = (mark: PortMark) => {
    const { ep, at, hot, blocked, named, dot } = mark
    const id = portId(ep)
    if (mark.badge) return badge(id, at)
    const tappable = interactive && (named || dot || hot || blocked)
    return (
      <g
        key={id}
        className={`topo-port${hot ? ' is-hot' : ''}${blocked ? ' is-blocked' : ''}${pickClass(id)}`}
      >
        {(hot || blocked || pickClass(id)) && named && (
          <rect
            className="topo-ring"
            x={at.x - (ringPx(mark) * u) / 2}
            y={at.y - (RING_H_PX * u) / 2}
            width={ringPx(mark) * u}
            height={RING_H_PX * u}
            rx={(RING_H_PX * u) / 2}
            strokeWidth={3 * u}
          />
        )}
        {dot && <circle className="topo-dot" cx={at.x} cy={at.y} r={8 * u} strokeWidth={3 * u} />}
        {named && (
          <text
            x={at.x}
            y={at.y}
            fontSize={font}
            strokeWidth={6 * u}
            dominantBaseline="central"
            textAnchor="middle"
          >
            {ep.port}
          </text>
        )}
        {blocked && (
          <text
            x={at.x}
            y={at.y + font * 1.5}
            fontSize={font}
            strokeWidth={6 * u}
            dominantBaseline="central"
            textAnchor="middle"
          >
            ✕
          </text>
        )}
        {tappable && (
          <circle
            className="topo-hit"
            cx={at.x}
            cy={at.y}
            r={HIT_PX * u}
            role="button"
            tabIndex={0}
            aria-label={describe(id)}
            onClick={() => tap(id)}
            onKeyDown={keyTap(id)}
          />
        )}
      </g>
    )
  }

  return (
    <figure className="topo">
      {/* Only a drawing too big for any phone layout scrolls sideways (focusable for keys). */}
      <div className="topo-scroll" tabIndex={wide ? 0 : undefined}>
        <svg
          viewBox={`${minX} ${minY} ${W} ${H}`}
          role={interactive ? 'group' : 'img'}
          aria-label={v.caption}
          preserveAspectRatio="xMidYMid meet"
          style={{ minWidth: `${Math.ceil(naturalWidth)}px` }}
        >
          {links.map((g) => (
            <g
              key={g.l.id}
              className={`topo-link${v.downLinks?.includes(g.l.id) ? ' is-down' : ''}`}
            >
              <line x1={g.ax} y1={g.ay} x2={g.bx} y2={g.by} strokeWidth={3 * u} />
              {!linksHidden && v.linkLabels?.[g.l.id] && (
                <text
                  x={g.mid.x}
                  y={g.mid.y}
                  fontSize={font}
                  strokeWidth={6 * u}
                  dominantBaseline="central"
                  textAnchor="middle"
                  className="topo-link-label"
                >
                  {v.linkLabels[g.l.id]}
                </text>
              )}
            </g>
          ))}
          {t.devices.map((d) => {
            const w = boxW(d)
            const hot = v.highlightDevices?.includes(d.id)
            return (
              <g
                key={d.id}
                className={`topo-device kind-${d.kind}${hot ? ' is-hot' : ''}${pickClass(d.id)}`}
                {...(interactive
                  ? {
                      role: 'button',
                      tabIndex: 0,
                      'aria-label': describe(d.id),
                      onClick: () => tap(d.id),
                      onKeyDown: keyTap(d.id),
                    }
                  : {})}
              >
                <rect
                  x={d.x - w / 2}
                  y={d.y - boxH / 2}
                  width={w}
                  height={boxH}
                  rx={d.kind === 'host' ? 6 * u : 12 * u}
                  strokeWidth={(hot || pickClass(d.id) ? 5 : 2) * u}
                />
                <text
                  x={d.x}
                  y={d.y}
                  fontSize={font}
                  dominantBaseline="central"
                  textAnchor="middle"
                >
                  {d.label}
                </text>
                {notes[d.id] && (
                  <text
                    x={d.x}
                    y={d.y + boxH / 2 + font * 0.95}
                    fontSize={font}
                    strokeWidth={6 * u}
                    dominantBaseline="central"
                    textAnchor="middle"
                    className="topo-note"
                  >
                    {notes[d.id]}
                  </text>
                )}
              </g>
            )
          })}
          {links.map((g) => g.ports.map(portMark))}
          {t.devices.map((d) =>
            v.badgeDevices?.includes(d.id) ? badge(d.id, badgeAt(d, u)) : null,
          )}
        </svg>
      </div>
      <figcaption>{v.caption}</figcaption>
      {interactive && (
        <p className="topo-info" aria-live="polite">
          {inspect
            ? describe(inspect)
            : linksHidden
              ? 'Link speeds and costs are hidden to fit: tap a port to read one.'
              : compact
                ? 'Tap a dot to see its port, or a switch for its details.'
                : 'Tap a port or switch for its details.'}
        </p>
      )}
    </figure>
  )
}
