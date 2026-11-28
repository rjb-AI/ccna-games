/**
 * Several switches and hosts wired together. Traces where a frame from one host ends up, hop by
 * hop, using processFrame on every switch it reaches.
 */
import { type SwitchConfig } from '../../device'
import type { Endpoint } from '../../topology'
import {
  BROADCAST_MAC,
  type Frame,
  type FrameResult,
  type MacTable,
  processFrame,
} from './switching'

export interface L2Host {
  id: string
  mac: string
  at: Endpoint
}

export interface L2Network {
  switches: Readonly<Record<string, SwitchConfig>>
  /** Switch-to-switch cables. */
  trunks: readonly { a: Endpoint; b: Endpoint }[]
  hosts: readonly L2Host[]
}

export interface Hop {
  switchId: string
  ingress: string
  frame: Frame
  result: FrameResult
}

export interface Delivery {
  hops: Hop[]
  /** Hosts whose port the frame came out of. */
  reached: string[]
}

function across(net: L2Network, ep: Endpoint): Endpoint | null {
  for (const t of net.trunks) {
    if (t.a.device === ep.device && t.a.port === ep.port) return t.b
    if (t.b.device === ep.device && t.b.port === ep.port) return t.a
  }
  return null
}

/**
 * Send a frame from a host and follow it. Each switch starts with the given table (default empty).
 * Loop-free topologies only (the callers build trees); a visited set guards against loops.
 */
export function deliver(
  net: L2Network,
  fromHost: string,
  frame: Frame,
  tables: Readonly<Record<string, MacTable>> = {},
  now = 0,
): Delivery {
  const host = net.hosts.find((h) => h.id === fromHost)
  if (!host) throw new Error(`No host ${fromHost}`)
  const hops: Hop[] = []
  const reached: string[] = []
  const visited = new Set<string>()
  const queue: { switchId: string; ingress: string; frame: Frame }[] = [
    { switchId: host.at.device, ingress: host.at.port, frame },
  ]
  while (queue.length) {
    const { switchId, ingress, frame: f } = queue.shift() as (typeof queue)[number]
    if (visited.has(switchId)) continue
    visited.add(switchId)
    const sw = net.switches[switchId] as SwitchConfig
    const result = processFrame(sw, tables[switchId] ?? [], ingress, f, now)
    hops.push({ switchId, ingress, frame: f, result })
    for (const e of result.out) {
      const h = net.hosts.find((x) => x.at.device === switchId && x.at.port === e.port)
      if (h) {
        reached.push(h.id)
        continue
      }
      const next = across(net, { device: switchId, port: e.port })
      if (next) {
        const vlan = result.vlan as number
        queue.push({
          switchId: next.device,
          ingress: next.port,
          frame: { src: f.src, dst: f.dst, ...(e.tagged ? { tag: vlan } : {}) },
        })
      }
    }
  }
  return { hops, reached }
}

/** Can host a reach host b? (A broadcast from a comes out of b's port.) */
export function canReach(net: L2Network, a: string, b: string): boolean {
  const src = net.hosts.find((h) => h.id === a)?.mac as string
  return deliver(net, a, { src, dst: BROADCAST_MAC }).reached.includes(b)
}
