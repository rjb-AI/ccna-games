import { describe, expect, it } from 'vitest'
import { parseIPv4 } from '../../netmath'
import { type Nic, type RoutedPath, arpTarget, headersBack, headersThere } from './forwarding'

const ip = (s: string) => parseIPv4(s) as number
const nic = (device: string, name: string, mac: string, addr: string, prefix = 24): Nic => ({
  device,
  name,
  mac,
  ip: ip(addr),
  prefix,
})

const pc = nic('PC', 'eth0', '0000.0000.00a1', '192.168.1.10')
const r1in = nic('R1', 'Gi0/0', '0000.0000.0101', '192.168.1.1')
const r1out = nic('R1', 'Gi0/1', '0000.0000.0102', '203.0.113.2', 30)
const r2in = nic('R2', 'Gi0/0', '0000.0000.0201', '203.0.113.1', 30)
const r2out = nic('R2', 'Gi0/1', '0000.0000.0202', '198.51.100.1')
const srv = nic('Server', 'eth0', '0000.0000.00b1', '198.51.100.80')

const path: RoutedPath = {
  srcIp: pc.ip,
  dstIp: srv.ip,
  segments: [
    { from: pc, to: r1in },
    { from: r1out, to: r2in },
    { from: r2out, to: srv },
  ],
}

describe('hop-by-hop headers', () => {
  it('MACs change every hop, IPs stay the same without NAT', () => {
    expect([0, 1, 2].map((i) => headersThere(path, i))).toEqual([
      { srcMac: pc.mac, dstMac: r1in.mac, srcIp: pc.ip, dstIp: srv.ip },
      { srcMac: r1out.mac, dstMac: r2in.mac, srcIp: pc.ip, dstIp: srv.ip },
      { srcMac: r2out.mac, dstMac: srv.mac, srcIp: pc.ip, dstIp: srv.ip },
    ])
  })

  it('NAT on R1 changes the source IP after R1, and the reply is translated back', () => {
    const nat = {
      ...path,
      nat: { router: 'R1', insideLocal: pc.ip, insideGlobal: ip('203.0.113.2') },
    }
    expect(headersThere(nat, 0).srcIp).toBe(pc.ip)
    expect(headersThere(nat, 1).srcIp).toBe(ip('203.0.113.2'))
    expect(headersThere(nat, 2).srcIp).toBe(ip('203.0.113.2'))
    expect(headersBack(nat, 2)).toEqual({
      srcMac: srv.mac,
      dstMac: r2out.mac,
      srcIp: srv.ip,
      dstIp: ip('203.0.113.2'),
    })
    expect(headersBack(nat, 0).dstIp).toBe(pc.ip)
  })

  it('ARP for the destination if local, else for the gateway', () => {
    const host = { ip: pc.ip, prefix: 24, gateway: r1in.ip }
    expect(arpTarget(host, ip('192.168.1.77'))).toEqual({ ip: ip('192.168.1.77'), local: true })
    expect(arpTarget(host, srv.ip)).toEqual({ ip: r1in.ip, local: false })
  })
})
