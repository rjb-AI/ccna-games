/**
 * Draws a topology as SVG. Sizes scale with the drawing so text stays readable on a phone:
 * the unit `u` is about one CSS pixel when the drawing is shown 360 px wide.
 */
import { type Endpoint, type Link, device } from '../../core/topology'
import type { TopologyVisual } from '../frame/visuals'
import './topology.css'

const same = (a: Endpoint, b: Endpoint) => a.device === b.device && a.port === b.port

export function TopologyView({ v }: { v: TopologyVisual }) {
  const { topology: t } = v
  const xs = t.devices.map((d) => d.x)
  const ys = t.devices.map((d) => d.y)
  const spanX = Math.max(...xs) - Math.min(...xs)
  const spanY = Math.max(...ys) - Math.min(...ys)
  // Width of the drawing in layout units, then the unit for text and boxes: about one CSS
  // pixel when the drawing is shown 340 px wide. Margins only leave room for boxes and labels.
  const longest = Math.max(...t.devices.map((d) => d.label.length))
  const W0 = Math.max(spanX, spanY * 0.55, 300) // tall drawings may be up to ~1.8x taller than wide
  const u = W0 / (340 - Math.max(80, longest * 10 + 30) - 40)
  const font = 16 * u
  const small = 13 * u
  const boxH = 40 * u
  const boxW = (d: (typeof t.devices)[number]) =>
    Math.max(64 * u, d.label.length * font * 0.62 + 20 * u)
  const notes = v.deviceNotes ?? {}
  const noteH = Object.keys(notes).length ? small * 1.4 : 0
  const maxBox = Math.max(...t.devices.map(boxW))
  // Narrow (tall) drawings keep the same scale and are centred, instead of being blown up.
  const W = Math.max(spanX, W0) + maxBox + 40 * u
  const minX = (Math.min(...xs) + Math.max(...xs)) / 2 - W / 2
  const minY = Math.min(...ys) - boxH / 2 - 20 * u
  const H = spanY + boxH + noteH + 40 * u

  // Parallel links between the same pair get spread apart.
  const pairKey = (l: Link) => [l.a.device, l.b.device].sort().join('|')
  const groups = new Map<string, Link[]>()
  for (const l of t.links) groups.set(pairKey(l), [...(groups.get(pairKey(l)) ?? []), l])

  const geometry = t.links.map((l) => {
    const a = device(t, l.a.device)
    const b = device(t, l.b.device)
    const group = groups.get(pairKey(l)) as Link[]
    const idx = group.indexOf(l)
    const spread = (idx - (group.length - 1) / 2) * 34 * u
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const ax = a.x + nx * spread
    const ay = a.y + ny * spread
    const bx = b.x + nx * spread
    const by = b.y + ny * spread
    // Port labels sit just outside each device box, along the link.
    const edge = (d: typeof a) =>
      Math.min(boxW(d) / 2 / Math.abs(dx / len || 1e-9), boxH / 2 / Math.abs(dy / len || 1e-9))
    const off = 20 * u
    const pa = { x: ax + (dx / len) * (edge(a) + off), y: ay + (dy / len) * (edge(a) + off) }
    const pb = { x: bx - (dx / len) * (edge(b) + off), y: by - (dy / len) * (edge(b) + off) }
    return {
      l,
      ax,
      ay,
      bx,
      by,
      pa,
      pb,
      mid: { x: ax + (bx - ax) * 0.4 + nx * 14 * u, y: ay + (by - ay) * 0.4 + ny * 14 * u },
    }
  })

  const isBlocked = (ep: Endpoint) => v.blockedPorts?.some((p) => same(p, ep)) ?? false
  const isHot = (ep: Endpoint) => v.highlightPorts?.some((p) => same(p, ep)) ?? false

  const portLabel = (ep: Endpoint, at: { x: number; y: number }) => {
    const hot = isHot(ep)
    const blocked = isBlocked(ep)
    const onHost = device(t, ep.device).kind === 'host'
    if ((!v.showPorts || onHost) && !hot && !blocked) return null
    return (
      <g
        key={`${ep.device}:${ep.port}`}
        className={`topo-port${hot ? ' is-hot' : ''}${blocked ? ' is-blocked' : ''}`}
      >
        {(hot || blocked) && <circle cx={at.x} cy={at.y} r={small * 1.25} strokeWidth={3 * u} />}
        {(v.showPorts && !onHost) || hot ? (
          <text
            x={at.x}
            y={at.y}
            fontSize={small}
            strokeWidth={6 * u}
            dominantBaseline="central"
            textAnchor="middle"
          >
            {ep.port}
          </text>
        ) : null}
        {blocked && (
          <text
            x={at.x}
            y={at.y + small * 1.5}
            fontSize={small}
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
      <svg
        viewBox={`${minX} ${minY} ${W} ${H}`}
        role="img"
        aria-label={v.caption}
        preserveAspectRatio="xMidYMid meet"
      >
        {geometry.map((g) => (
          <g key={g.l.id} className={`topo-link${v.downLinks?.includes(g.l.id) ? ' is-down' : ''}`}>
            <line x1={g.ax} y1={g.ay} x2={g.bx} y2={g.by} strokeWidth={3 * u} />
            {v.linkLabels?.[g.l.id] && (
              <text
                x={g.mid.x}
                y={g.mid.y}
                fontSize={small}
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
              <text x={d.x} y={d.y} fontSize={font} dominantBaseline="central" textAnchor="middle">
                {d.label}
              </text>
              {notes[d.id] && (
                <text
                  x={d.x}
                  y={d.y + boxH / 2 + small * 0.95}
                  fontSize={small}
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
        {geometry.map((g) => [portLabel(g.l.a, g.pa), portLabel(g.l.b, g.pb)])}
      </svg>
      <figcaption>{v.caption}</figcaption>
    </figure>
  )
}
