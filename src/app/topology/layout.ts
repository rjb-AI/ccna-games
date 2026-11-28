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
/** Device boxes are tap targets too: 48 px tall. */
const BOX_H_PX = 48
/** Port labels sit at least this fraction of the link away from the device centre. */
const PORT_AT = 0.27

/** Width in CSS px of a line of text at TEXT_PX. */
export const textPx = (text: string) => text.length * TEXT_PX * CHAR_EM

const boxPx = (d: Device) => Math.max(64, textPx(d.label) + 20)

/** Size in CSS px of a label badge on a port or device (a 48px tap target is drawn round it). */
export const BADGE_PX = 40

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
  /** A port drawn as a dot (its name didn't fit): tap it to read the name. */
  dot: boolean
  /** A port that carries a label badge (labels on the diagram). */
  badge: boolean
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
  /** The drawing as laid out (devices may be stretched down from the input positions). */
  topology: TopologyVisual['topology']
  /** Some port names are dots (tap to read) because all of them didn't fit a phone. */
  compact: boolean
  /** Link labels are left off the drawing (tap a port or switch to read them). */
  linksHidden: boolean
}

/** Where a device's label badge sits: just right of its box. */
export function badgeAt(d: Device, u: number): Point {
  return { x: d.x + ((boxPx(d) + BADGE_PX) / 2 + 6) * u, y: d.y }
}

/** Hotspot id for a port: "device:port". */
export const portId = (ep: Endpoint) => `${ep.device}:${ep.port}`

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
function place(
  v: TopologyVisual,
  u: number,
  compact = false,
): { links: LinkGeometry[]; overlaps: number } {
  const t = v.topology
  const notes = v.deviceNotes ?? {}
  const rects: Rect[] = []
  for (const d of t.devices) {
    rects.push(rectAt(d, boxPx(d), BOX_H_PX, u))
    if (v.badgeDevices?.includes(d.id)) rects.push(rectAt(badgeAt(d, u), BADGE_PX, BADGE_PX, u))
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
    // A highlighted or blocked port has a ring round its name, wider and taller than the text.
    const ringed = (ep: Endpoint) =>
      !!v.highlightPorts?.some((p) => same(p, ep)) || !!v.blockedPorts?.some((p) => same(p, ep))
    const badged = (ep: Endpoint) => !!v.badgePorts?.some((p) => same(p, ep))
    const off = (ep: Endpoint) => {
      const [w, h] = badged(ep)
        ? [BADGE_PX + 8, BADGE_PX + 8]
        : ringed(ep)
          ? [textPx(ep.port) + 18, RING_H_PX]
          : [textPx(ep.port), 28]
      return ((Math.abs(ux) * w) / 2 + (Math.abs(uy) * h) / 2 + 8) * u
    }
    // Port labels on parallel links are staggered along the link so they do not stack.
    const dist = (d: Device, ep: Endpoint) =>
      Math.max(edge(d) + off(ep), len * PORT_AT) + idx * len * 0.12
    const mark = (ep: Endpoint, at: Point): PortMark => {
      const hot = v.highlightPorts?.some((p) => same(p, ep)) ?? false
      const onHost = device(t, ep.device).kind === 'host'
      const wanted = !!v.showPorts && !onHost
      const badge = badged(ep)
      const named = !badge && ((wanted && (!compact || !!v.focusPorts?.includes(ep.device))) || hot)
      const blocked = v.blockedPorts?.some((p) => same(p, ep)) ?? false
      return { ep, at, hot, blocked, named, dot: wanted && !named && !badge, badge }
    }
    // Each port label takes the first spot along its link (stepping away from its device) that
    // nothing else covers yet, like link labels do.
    const sizeOf = (p: PortMark): [number, number] =>
      p.badge
        ? [BADGE_PX + 8, BADGE_PX + 8]
        : p.hot || p.blocked
          ? [ringPx(p), RING_H_PX]
          : [textPx(p.ep.port), 22]
    const placePort = (ep: Endpoint, d: Device, sx: number, sy: number, dir: 1 | -1) => {
      const base = dist(d, ep)
      const probe = mark(ep, { x: 0, y: 0 })
      const [w, h] = sizeOf(probe)
      const steps = [0, 0.08, 0.16, 0.24].map((f) => base + f * len)
      const spots = steps
        .filter((s2) => s2 < len / 2 - (w / 2) * u * Math.abs(ux) - 4 * u || s2 === base)
        .map((s2) => ({ x: sx + dir * ux * s2, y: sy + dir * uy * s2 }))
      const free =
        probe.named || probe.hot || probe.blocked || probe.badge
          ? spots.find((c) => !rects.some((r) => cover(r, rectAt(c, w, h, u))))
          : undefined
      return mark(ep, free ?? (spots[0] as Point))
    }
    const ports = [placePort(l.a, a, ax, ay, 1), placePort(l.b, b, bx, by, -1)]
    for (const p of ports) {
      if (p.badge) rects.push(rectAt(p.at, BADGE_PX + 8, BADGE_PX + 8, u))
      else if (p.hot || p.blocked) rects.push(rectAt(p.at, ringPx(p), RING_H_PX, u))
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

/** Stretch a drawing vertically (phones are tall): same x, y spread from the centre. */
function stretchY(v: TopologyVisual, k: number): TopologyVisual {
  if (k === 1) return v
  const ys = v.topology.devices.map((d) => d.y)
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  return {
    ...v,
    topology: {
      ...v.topology,
      devices: v.topology.devices.map((d) => ({ ...d, y: cy + (d.y - cy) * k })),
    },
  }
}

/** Swap across and down: a wide drawing becomes a tall one. */
function transpose(v: TopologyVisual): TopologyVisual {
  return {
    ...v,
    topology: { ...v.topology, devices: v.topology.devices.map((d) => ({ ...d, x: d.y, y: d.x })) },
  }
}

/** Width of the drawing's own coordinates, and the layout width it is fitted to. */
function spans(v: TopologyVisual) {
  const xs = v.topology.devices.map((d) => d.x)
  const ys = v.topology.devices.map((d) => d.y)
  const spanX = Math.max(...xs) - Math.min(...xs)
  const spanY = Math.max(...ys) - Math.min(...ys)
  // A device with a label badge needs room for the badge beside it.
  const maxBoxPx = Math.max(
    ...v.topology.devices.map(
      (d) => boxPx(d) + (v.badgeDevices?.includes(d.id) ? 2 * (BADGE_PX + 6) : 0),
    ),
  )
  // A drawing may be up to TALLEST times taller than wide (phones are tall); tiny ones are not
  // blown up.
  return { spanX, maxBoxPx, W0: Math.max(spanX, spanY / TALLEST, 300) }
}

/** Tallest drawing, as a multiple of its width, before it is scaled down to fit. */
const TALLEST = 2.2

/**
 * CSS width the drawing needs at scale u. `w0` is the layout width of the drawing before it was
 * stretched down, so stretching adds height instead of being scaled away.
 */
function naturalOf(v: TopologyVisual, u: number, w0?: number): number {
  const { spanX, maxBoxPx, W0 } = spans(v)
  return (Math.max(spanX, w0 ?? W0) + (maxBoxPx + 40) * u) / u
}

/** The scale at which the drawing is exactly a phone's width. */
function fitScale(v: TopologyVisual): number {
  const { maxBoxPx, W0 } = spans(v)
  return W0 / Math.max(FIT_PX - maxBoxPx - 40, 120)
}

/** How far a drawing may be stretched down before it gets wider instead. */
const MAX_STRETCH_Y = 2.6

export function layoutTopology(input: TopologyVisual): TopoLayout {
  const base = input.topology
  const xs = base.devices.map((d) => d.x)
  const spanX = Math.max(...xs) - Math.min(...xs)
  const ys0 = base.devices.map((d) => d.y)
  const spanY0 = Math.max(...ys0) - Math.min(...ys0)
  // Tall drawings may be up to ~1.8x taller than wide; tiny ones are not blown up.

  // Start at the scale that fits a phone. Make room for labels by stretching the drawing down
  // (phones are tall), or by turning a wide drawing on its side; only if neither works, spread it
  // wider (which makes it scroll).
  const search = (compact: boolean, input: TopologyVisual) => {
    // A stretched or turned drawing is only used if it fits a phone with nothing covered.
    const candidates = spanX > spanY0 ? [input, transpose(input)] : [input]
    for (const c of candidates) {
      const cu = fitScale(c)
      for (let k = 1; k <= MAX_STRETCH_Y + 1e-9; k += 0.1) {
        const sv = stretchY(c, k)
        const p = place(sv, cu, compact)
        const w0 = spans(c).W0
        if (p.overlaps === 0 && naturalOf(sv, cu, w0) <= FIT_PX + 1)
          return { v: sv, u: cu, compact, w0, ...p }
      }
    }
    // Otherwise keep the drawing as designed and spread it wider until labels have room.
    const fitU = fitScale(input)
    let best = {
      v: input,
      u: fitU,
      compact,
      w0: spans(input).W0,
      ...place(input, fitU, compact),
    }
    for (
      let next = best.u * 0.9;
      best.overlaps > 0 && naturalOf(input, next) <= MAX_NATURAL_PX;
      next *= 0.9
    ) {
      const p = place(input, next, compact)
      if (p.overlaps < best.overlaps) best = { ...best, u: next, ...p }
    }
    return best
  }
  // Every label on the drawing if that fits a phone. If not, ports become dots; if that still
  // doesn't fit, link labels move off the drawing too. Both are read by tapping (TopologyView).
  const fits = (b: { v: TopologyVisual; u: number; w0: number }) =>
    naturalOf(b.v, b.u, b.w0) <= FIT_PX + 1
  let best = { ...search(false, input), linksHidden: false }
  if (!fits(best) && input.showPorts) {
    const c = search(true, input)
    if (naturalOf(c.v, c.u, c.w0) < naturalOf(best.v, best.u, best.w0))
      best = { ...c, linksHidden: false }
  }
  if (!fits(best) && input.linkLabels && Object.keys(input.linkLabels).length) {
    const bare: TopologyVisual = { ...input }
    delete bare.linkLabels
    const c = search(!!input.showPorts, bare)
    if (naturalOf(c.v, c.u, c.w0) < naturalOf(best.v, best.u, best.w0))
      best = { ...c, linksHidden: true }
  }
  const { v, u, links, overlaps, compact, linksHidden, w0 } = best
  const t = v.topology
  const natural = (uu: number) => naturalOf(v, uu, w0)
  const xs2 = t.devices.map((d) => d.x)
  const ys = t.devices.map((d) => d.y)
  const spanY = Math.max(...ys) - Math.min(...ys)
  const notePx = Object.keys(v.deviceNotes ?? {}).length ? TEXT_PX * 1.4 : 0

  const boxH = BOX_H_PX * u
  // Narrow (tall) drawings keep the same scale and are centred, instead of being blown up.
  const W = natural(u) * u
  const minX = (Math.min(...xs2) + Math.max(...xs2)) / 2 - W / 2
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
    topology: t,
    compact,
    linksHidden,
  }
}
