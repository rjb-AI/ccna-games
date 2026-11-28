/**
 * Draws a topology as SVG. Sizes come from layout.ts: `u` is one CSS pixel at the drawing's
 * natural width, every label is 20 CSS px there, and the drawing is never shown narrower (a wide
 * one scrolls sideways inside its box).
 */
import type { TopologyVisual } from '../frame/visuals'
import { FIT_PX, type PortMark, RING_H_PX, layoutTopology, ringPx } from './layout'
import './topology.css'

export function TopologyView({ v }: { v: TopologyVisual }) {
  const { topology: t } = v
  const { u, font, boxH, boxW, links, minX, minY, W, H, naturalWidth } = layoutTopology(v)
  const notes = v.deviceNotes ?? {}
  const wide = naturalWidth > FIT_PX

  // Port, link and note labels use the same size as device names: nothing under 20 px.
  const portLabel = (mark: PortMark) => {
    const { ep, at, hot, blocked, named } = mark
    if (!named && !hot && !blocked) return null
    return (
      <g
        key={`${ep.device}:${ep.port}`}
        className={`topo-port${hot ? ' is-hot' : ''}${blocked ? ' is-blocked' : ''}`}
      >
        {(hot || blocked) && (
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
      </g>
    )
  }

  return (
    <figure className="topo">
      {/* Wider than a phone's diagram box: it scrolls sideways here (focusable for keys). */}
      <div className="topo-scroll" tabIndex={wide ? 0 : undefined}>
        <svg
          viewBox={`${minX} ${minY} ${W} ${H}`}
          role="img"
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
              {v.linkLabels?.[g.l.id] && (
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
              <g key={d.id} className={`topo-device kind-${d.kind}${hot ? ' is-hot' : ''}`}>
                <rect
                  x={d.x - w / 2}
                  y={d.y - boxH / 2}
                  width={w}
                  height={boxH}
                  rx={d.kind === 'host' ? 6 * u : 12 * u}
                  strokeWidth={(hot ? 5 : 2) * u}
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
          {links.map((g) => g.ports.map(portLabel))}
        </svg>
      </div>
      <figcaption>{v.caption}</figcaption>
    </figure>
  )
}
