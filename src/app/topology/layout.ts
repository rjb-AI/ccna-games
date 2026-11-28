/**
 * Geometry and sizes for a topology drawing. The one owner of the rule "diagram text is never
 * under 20 CSS px": every label is TEXT_PX CSS px when the drawing is shown at its natural width,
 * and the drawing is never shown narrower than that (a wide one scrolls sideways inside its own
 * box instead of shrinking).
 *
 * `u` is layout units per CSS px. The drawing is made as small as fits FIT_PX (a phone's diagram
 * box), then spread out (smaller `u`) only as far as needed so that no two labels or boxes
 * cover each other.
 */
import { type Device, type Endpoint, type Link, device } from '../../core/topology'
import type { TopologyVisual } from '../frame/visuals'

/** Width of the diagram box on a 390 px phone: 390 minus page gutters, padding and border. */
export const FIT_PX = 340
/** Every label in a diagram, in CSS px (theme rule: nothing under 20px). */
export const TEXT_PX = 20
/** Widest a drawing is spread to while looking for room for its labels. */
const MAX_NATURAL_PX = 1400
/** Rough width of one character per px of font size (bold body font and mono both fit). */
const CHAR_EM = 0.62
const BOX_H_PX = 44
/** Port labels sit at least this fraction of the link away from the device centre. */
const PORT_AT = 0.27

/** Width in CSS px of a line of text at TEXT_PX. */
export const textPx = (text: string) => text.length * TEXT_PX * CHAR_EM

const boxPx = (d: Device) => Math.max(64, textPx(d.label) + 20)

/** Height in CSS px of the ring drawn round a highlighted or blocked port. */
export const RING_H_PX = 36

/** Width in CSS px of that ring: round for a bare mark, a pill round a port name. */
export const ringPx = (p: PortMark) => (p.named ? textPx(p.ep.port) + 18 : RING_H_PX)

export interface Point {
  x: number
  y: number
}

export interface PortMark {
  ep: Endpoint
  at: Point
  hot: boolean
  blocked: boolean
  /** Port name shown (ports on, and not a host; or highlighted). */
  named: boolean
}

export interface LinkGeometry {
  l: Link
  ax: number
  ay: number
  bx: number
  by: number
  /** Where the link label goes. */
  mid: Point
  ports: PortMark[]
}

export interface TopoLayout {
  /** Layout units per CSS px. */
  u: number
  /** Font size in layout units (TEXT_PX CSS px). */
  font: number
  boxH: number
  boxW(d: Device): number
  links: LinkGeometry[]
  minX: number
  minY: number
  W: number
  H: number
  /** Smallest CSS width to show the drawing at, so text stays TEXT_PX or more. */
  naturalWidth: number
  /** Pairs of labels or boxes that still cover each other at the widest spread (ideally 0). */
  overlaps: number
}

const same = (a: Endpoint, b: Endpoint) => a.device === b.device && a.port === b.port

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** A label-sized rectangle centred on `c`, sizes in CSS px. */
const rectAt = (c: Point, wPx: number, hPx: number, u: number): Rect => ({
  x: c.x - (wPx * u) / 2,
  y: c.y - (hPx * u) / 2,
  w: wPx * u,
  h: hPx * u,
})

const cover = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** Where along a link its label may go, best first: the middle, then either side. */
const LABEL_AT = [0.5, 0.38, 0.62, 0.3, 0.7] as const

/**
 * Places links, port marks and link labels at scale `u`, and counts pairs of boxes and labels
 * that cover each other. Link labels take the first spot along their link that is free.
 */
function place(v: TopologyVisual, u: number): { links: LinkGeometry[]; overlaps: number } {
  const t = v.topology
  const notes = v.deviceNotes ?? {}
  const rects: Rect[] = []
  for (const d of t.devices) {
    rects.push(rectAt(d, boxPx(d), BOX_H_PX, u))
    const note = notes[d.id]
    if (note) rects.push(rectAt({ x: d.x, y: d.y + (BOX_H_PX / 2 + 19) * u }, textPx(note), 22, u))
  }

  const pairKey = (l: Link) => [l.a.device, l.b.device].sort().join('|')
  const groups = new Map<string, Link[]>()
  for (const l of t.links) groups.set(pairKey(l), [...(groups.get(pairKey(l)) ?? []), l])
  const boxH = BOX_H_PX * u

  /** Per link: a point beside it at fraction f of the way along. */
  const spotOf: ((f: number) => Point)[] = []
  const links: LinkGeometry[] = t.links.map((l) => {
    const a = device(t, l.a.device)
    const b = device(t, l.b.device)
    const group = groups.get(pairKey(l)) as Link[]
    const idx = group.indexOf(l)
    // Parallel links between the same pair get spread apart, on the same side whichever end
    // each link lists first.
    const offset = idx - (group.length - 1) / 2
    const spread = offset * 34 * u
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const [ux, uy] = [dx / len, dy / len]
    const side = a.id < b.id ? 1 : -1
    const [nx, ny] = [-uy * side, ux * side]
    const ax = a.x + nx * spread
    const ay = a.y + ny * spread
    const bx = b.x + nx * spread
    const by = b.y + ny * spread
    // Port labels sit outside each device box, along the link, clear of the box.
    const edge = (d: Device) =>
      Math.min((boxPx(d) * u) / 2 / Math.abs(ux || 1e-9), boxH / 2 / Math.abs(uy || 1e-9))
    const off = (port: string) => ((Math.abs(ux) * textPx(port)) / 2 + Math.abs(uy) * 14 + 8) * u
    // Port labels on parallel links are staggered along the link so they do not stack.
    const dist = (d: Device, port: string) =>
      Math.max(edge(d) + off(port), len * PORT_AT) + idx * len * 0.12
    const mark = (ep: Endpoint, at: Point): PortMark => {
      const hot = v.highlightPorts?.some((p) => same(p, ep)) ?? false
      const onHost = device(t, ep.device).kind === 'host'
      return {
        ep,
        at,
        hot,
        blocked: v.blockedPorts?.some((p) => same(p, ep)) ?? false,
        named: (!!v.showPorts && !onHost) || hot,
      }
    }
    const da = dist(a, l.a.port)
    const db = dist(b, l.b.port)
    const ports = [
      mark(l.a, { x: ax + ux * da, y: ay + uy * da }),
      mark(l.b, { x: bx - ux * db, y: by - uy * db }),
    ]
    for (const p of ports) {
      if (p.hot || p.blocked) rects.push(rectAt(p.at, ringPx(p), RING_H_PX, u))
      else if (p.named) rects.push(rectAt(p.at, textPx(p.ep.port), 22, u))
      if (p.blocked) rects.push(rectAt({ x: p.at.x, y: p.at.y + 30 * u }, 16, 22, u))
    }
    // The label sits beside its line, on the outer side when links run in parallel.
    const lift = (offset < 0 ? -16 : 16) * u
    const at = (f: number) => ({
      x: ax + (bx - ax) * f + nx * lift,
      y: ay + (by - ay) * f + ny * lift,
    })
    spotOf.push(at)
    return { l, ax, ay, bx, by, mid: at(0.5), ports }
  })

  // Link labels last, each in the first free spot along its link.
  for (const [i, g] of links.entries()) {
    const label = v.linkLabels?.[g.l.id]
    if (!label) continue
    const spots = LABEL_AT.map(spotOf[i] as (f: number) => Point)
    const free = spots.find((c) => !rects.some((r) => cover(r, rectAt(c, textPx(label), 22, u))))
    g.mid = free ?? g.mid
    rects.push(rectAt(g.mid, textPx(label), 22, u))
  }

  let overlaps = 0
  for (const [i, a] of rects.entries()) {
    for (const b of rects.slice(i + 1)) if (cover(a, b)) overlaps++
  }
  return { links, overlaps }
}

export function layoutTopology(v: TopologyVisual): TopoLayout {
  const t = v.topology
  const xs = t.devices.map((d) => d.x)
  const ys = t.devices.map((d) => d.y)
  const spanX = Math.max(...xs) - Math.min(...xs)
  const spanY = Math.max(...ys) - Math.min(...ys)
  const notePx = Object.keys(v.deviceNotes ?? {}).length ? TEXT_PX * 1.4 : 0
  const maxBoxPx = Math.max(...t.devices.map(boxPx))
  // Tall drawings may be up to ~1.8x taller than wide; tiny ones are not blown up.
  const W0 = Math.max(spanX, spanY * 0.55, 300)
  const natural = (u: number) => (Math.max(spanX, W0) + (maxBoxPx + 40) * u) / u

  // Start at the scale that fits a phone, then spread out until nothing covers anything.
  let u = W0 / Math.max(FIT_PX - maxBoxPx - 40, 120)
  let { links, overlaps } = place(v, u)
  for (let next = u * 0.9; overlaps > 0 && natural(next) <= MAX_NATURAL_PX; next *= 0.9) {
    const p = place(v, next)
    if (p.overlaps < overlaps) [u, links, overlaps] = [next, p.links, p.overlaps]
  }

  const boxH = BOX_H_PX * u
  // Narrow (tall) drawings keep the same scale and are centred, instead of being blown up.
  const W = natural(u) * u
  const minX = (Math.min(...xs) + Math.max(...xs)) / 2 - W / 2
  const minY = Math.min(...ys) - boxH / 2 - 20 * u
  const H = spanY + boxH + notePx * u + 40 * u
  return {
    u,
    font: TEXT_PX * u,
    boxH,
    boxW: (d: Device) => boxPx(d) * u,
    links,
    minX,
    minY,
    W,
    H,
    naturalWidth: natural(u),
    overlaps,
  }
}
