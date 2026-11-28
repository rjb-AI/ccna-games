/**
 * Network graph: devices, ports and links, with fixed layout positions for drawing.
 * The SVG renderer lives in src/app/topology (React); this module is pure data and helpers.
 */

export type DeviceKind = 'switch' | 'router' | 'host'

export interface Device {
  id: string
  kind: DeviceKind
  label: string
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

/** Short port label for diagrams: GigabitEthernet0/1 -> Gi0/1. */
export function shortPort(name: string): string {
  const m = /^([A-Za-z]+?)(Ethernet)?([\d/.]+)$/.exec(name)
  if (!m) return name
  const prefix: Record<string, string> = {
    Gigabit: 'Gi',
    FastEthernet: 'Fa',
    Fast: 'Fa',
    TenGigabit: 'Te',
    Ethernet: 'Eth',
  }
  return `${prefix[m[1] as string] ?? m[1]}${m[3]}`
}
