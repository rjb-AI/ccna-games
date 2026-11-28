/**
 * Network graph: devices, ports and links, with fixed layout positions for drawing.
 * The SVG renderer lives in src/app/topology (React); this module is pure data and helpers.
 */

export type DeviceKind = 'switch' | 'router' | 'host'

export interface Device {
  id: string
  kind: DeviceKind
  label: string
  /** Hardware model, as reported by CDP/LLDP (optional). */
  model?: string
  /** Layout position in a 0..1000 x 0..1000 space (fixed per scenario, no auto-layout). */
  x: number
  y: number
}

export interface Endpoint {
  device: string
  port: string
}

export interface Link {
  id: string
  a: Endpoint
  b: Endpoint
  /** Link speed in Mbps (used for STP path cost). */
  speed: number
}

export interface Topology {
  devices: readonly Device[]
  links: readonly Link[]
}

export function device(t: Topology, id: string): Device {
  const d = t.devices.find((x) => x.id === id)
  if (!d) throw new Error(`No device ${id}`)
  return d
}

/** Links touching a device. */
export function linksOf(t: Topology, deviceId: string): Link[] {
  return t.links.filter((l) => l.a.device === deviceId || l.b.device === deviceId)
}

/** The local and remote ends of a link, seen from one device. */
export function ends(l: Link, deviceId: string): { local: Endpoint; remote: Endpoint } {
  if (l.a.device === deviceId) return { local: l.a, remote: l.b }
  if (l.b.device === deviceId) return { local: l.b, remote: l.a }
  throw new Error(`Link ${l.id} does not touch ${deviceId}`)
}

/** The link plugged into a port, if any. */
export function linkAt(t: Topology, ep: Endpoint): Link | undefined {
  return t.links.find(
    (l) =>
      (l.a.device === ep.device && l.a.port === ep.port) ||
      (l.b.device === ep.device && l.b.port === ep.port),
  )
}

export function portsOf(t: Topology, deviceId: string): string[] {
  return linksOf(t, deviceId).map((l) => ends(l, deviceId).local.port)
}

/** True if every device can reach every other device. */
export function isConnected(t: Topology): boolean {
  if (t.devices.length === 0) return true
  const seen = new Set<string>([t.devices[0]?.id as string])
  const queue = [...seen]
  while (queue.length) {
    const id = queue.shift() as string
    for (const l of linksOf(t, id)) {
      const other = ends(l, id).remote.device
      if (!seen.has(other)) {
        seen.add(other)
        queue.push(other)
      }
    }
  }
  return seen.size === t.devices.length
}

export function withoutLink(t: Topology, linkId: string): Topology {
  return { devices: t.devices, links: t.links.filter((l) => l.id !== linkId) }
}

/** Evenly spaced positions on a circle, starting at the top. For small switch topologies. */
export function circleLayout(n: number): { x: number; y: number }[] {
  if (n === 1) return [{ x: 500, y: 500 }]
  return Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
    return {
      x: Math.round(500 + 380 * Math.cos(angle)),
      y: Math.round(500 + 380 * Math.sin(angle)),
    }
  })
}

export interface Neighbor {
  localPort: string
  neighbor: string
  neighborPort: string
  model: string
}

/** What a device learns about its directly connected neighbours (CDP/LLDP are link-local). */
export function neighborsOf(t: Topology, deviceId: string): Neighbor[] {
  return linksOf(t, deviceId).map((l) => {
    const { local, remote } = ends(l, deviceId)
    const d = device(t, remote.device)
    return {
      localPort: local.port,
      neighbor: d.label,
      neighborPort: remote.port,
      model: d.model ?? '',
    }
  })
}

export type DiagramDiff =
  | { kind: 'wrong-port'; device: string; documented: string; actual: string; link: string }
  | { kind: 'wrong-neighbor'; device: string; port: string; documented: string; actual: string }
  | { kind: 'missing-device'; device: string; attachedTo: string; port: string }
  | { kind: 'wrong-model'; device: string; documented: string; actual: string }

/** Differences between the documented diagram and what is really cabled. */
export function diagramDiffs(documented: Topology, actual: Topology): DiagramDiff[] {
  const out: DiagramDiff[] = []
  const docLabels = new Set(documented.devices.map((d) => d.label))
  for (const d of actual.devices) {
    if (!docLabels.has(d.label)) {
      const l = linksOf(actual, d.id)[0]
      const at = l ? ends(l, d.id).remote : { device: '', port: '' }
      out.push({
        kind: 'missing-device',
        device: d.label,
        attachedTo: at.device ? device(actual, at.device).label : '',
        port: at.port,
      })
      continue
    }
    const doc = documented.devices.find((x) => x.label === d.label) as Device
    if ((doc.model ?? '') !== (d.model ?? ''))
      out.push({
        kind: 'wrong-model',
        device: d.label,
        documented: doc.model ?? '',
        actual: d.model ?? '',
      })
  }
  // Compare each documented device's port -> neighbour with reality.
  for (const d of documented.devices) {
    const real = actual.devices.find((x) => x.label === d.label)
    if (!real) continue
    const docN = neighborsOf(documented, d.id)
    const realN = neighborsOf(actual, real.id).filter((n) => docLabels.has(n.neighbor))
    for (const n of docN) {
      const r = realN.find((x) => x.localPort === n.localPort)
      if (r && r.neighbor !== n.neighbor)
        out.push({
          kind: 'wrong-neighbor',
          device: d.label,
          port: n.localPort,
          documented: n.neighbor,
          actual: r.neighbor,
        })
      if (!r) {
        const moved = realN.find(
          (x) => x.neighbor === n.neighbor && !docN.some((y) => y.localPort === x.localPort),
        )
        if (moved)
          out.push({
            kind: 'wrong-port',
            device: d.label,
            documented: n.localPort,
            actual: moved.localPort,
            link: `${d.label}–${n.neighbor}`,
          })
      }
    }
  }
  return out
}
