/**
 * What the headers look like on each link as a packet is routed hop by hop.
 *
 * Rules: each router rewrites the Layer 2 header (new source MAC = its egress interface, new
 * destination MAC = the next hop's interface, found with ARP). Switches don't change addresses.
 * The IP addresses stay the same end to end unless NAT rewrites them.
 * Sources: RFC 1812 (router requirements, 5.2), RFC 826 (ARP), RFC 3022 (NAT/NAPT).
 */
import { type IPv4, inSubnet } from '../../netmath'

export interface Nic {
  device: string
  name: string
  mac: string
  ip: IPv4
  prefix: number
}

/** One Layer 2 link the packet crosses: from one Layer 3 device's interface to the next one's. */
export interface Segment {
  from: Nic
  to: Nic
}

export interface NatRule {
  /** Router doing the translation. */
  router: string
  insideLocal: IPv4
  insideGlobal: IPv4
}

export interface RoutedPath {
  srcIp: IPv4
  dstIp: IPv4
  /** Segments in order from source host to destination host. */
  segments: readonly Segment[]
  nat?: NatRule
}

export interface Headers {
  srcMac: string
  dstMac: string
  srcIp: IPv4
  dstIp: IPv4
}

/** Headers on segment i, going from source to destination. */
export function headersThere(path: RoutedPath, i: number): Headers {
  const seg = path.segments[i] as Segment
  // NAT rewrites the source once the packet has passed through the NAT router.
  const natIndex = path.nat
    ? path.segments.findIndex((s) => s.from.device === path.nat?.router)
    : -1
  const translated =
    path.nat && natIndex !== -1 && i >= natIndex && path.srcIp === path.nat.insideLocal
  return {
    srcMac: seg.from.mac,
    dstMac: seg.to.mac,
    srcIp: translated ? (path.nat as NatRule).insideGlobal : path.srcIp,
    dstIp: path.dstIp,
  }
}

/** Headers on segment i (counted from the source side) for the reply coming back. */
export function headersBack(path: RoutedPath, i: number): Headers {
  const seg = path.segments[i] as Segment
  const natIndex = path.nat
    ? path.segments.findIndex((s) => s.from.device === path.nat?.router)
    : -1
  // Coming back, the reply is addressed to the inside global until the NAT router turns it back.
  const beforeNat = path.nat && natIndex !== -1 && i >= natIndex
  return {
    srcMac: seg.to.mac,
    dstMac: seg.from.mac,
    srcIp: path.dstIp,
    dstIp: beforeNat ? (path.nat as NatRule).insideGlobal : path.srcIp,
  }
}

export interface ArpHost {
  ip: IPv4
  prefix: number
  gateway: IPv4
}

/**
 * Which IP a host ARPs for to send to `dst`: the destination itself if it is on the same subnet,
 * otherwise its default gateway.
 */
export function arpTarget(host: ArpHost, dst: IPv4): { ip: IPv4; local: boolean } {
  const local = inSubnet(dst, { network: host.ip, prefix: host.prefix })
  return { ip: local ? dst : host.gateway, local }
}
