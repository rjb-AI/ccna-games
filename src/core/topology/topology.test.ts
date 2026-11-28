import { describe, expect, it } from 'vitest'
import { type Topology, diagramDiffs, neighborsOf } from './index'

const actual: Topology = {
  devices: [
    { id: 'a', kind: 'switch', label: 'SW1', model: 'C9300', x: 0, y: 0 },
    { id: 'b', kind: 'switch', label: 'SW2', model: 'C9200', x: 0, y: 0 },
    { id: 'c', kind: 'switch', label: 'SW3', model: 'C9200', x: 0, y: 0 },
  ],
  links: [
    {
      id: '1',
      a: { device: 'a', port: 'Gi1/0/1' },
      b: { device: 'b', port: 'Gi1/0/24' },
      speed: 1000,
    },
    {
      id: '2',
      a: { device: 'a', port: 'Gi1/0/2' },
      b: { device: 'c', port: 'Gi1/0/24' },
      speed: 1000,
    },
  ],
}

describe('neighbour discovery', () => {
  it('lists directly connected neighbours only', () => {
    expect(neighborsOf(actual, 'b')).toEqual([
      { localPort: 'Gi1/0/24', neighbor: 'SW1', neighborPort: 'Gi1/0/1', model: 'C9300' },
    ])
    expect(neighborsOf(actual, 'a')).toHaveLength(2)
  })
})

describe('diagram diffs', () => {
  it('matching diagram has none', () => {
    expect(diagramDiffs(actual, actual)).toEqual([])
  })
  it('wrong model', () => {
    const doc = {
      ...actual,
      devices: actual.devices.map((d) => (d.id === 'c' ? { ...d, model: 'C9300' } : d)),
    }
    expect(diagramDiffs(doc, actual)).toEqual([
      { kind: 'wrong-model', device: 'SW3', documented: 'C9300', actual: 'C9200' },
    ])
  })
  it('wrong port label', () => {
    const doc = {
      ...actual,
      links: actual.links.map((l) =>
        l.id === '2' ? { ...l, a: { device: 'a', port: 'Gi1/0/3' } } : l,
      ),
    }
    expect(diagramDiffs(doc, actual)).toEqual([
      {
        kind: 'wrong-port',
        device: 'SW1',
        documented: 'Gi1/0/3',
        actual: 'Gi1/0/2',
        link: 'SW1–SW3',
      },
    ])
  })
  it('swapped cables show as two wrong neighbours on one switch', () => {
    const doc = {
      ...actual,
      links: actual.links.map((l) => ({
        ...l,
        a: { device: 'a', port: l.id === '1' ? 'Gi1/0/2' : 'Gi1/0/1' },
      })),
    }
    expect(diagramDiffs(doc, actual).map((d) => d.kind)).toEqual([
      'wrong-neighbor',
      'wrong-neighbor',
    ])
  })
  it('an undocumented switch', () => {
    const real: Topology = {
      devices: [
        ...actual.devices,
        { id: 'd', kind: 'switch', label: 'SW4', model: 'C9200', x: 0, y: 0 },
      ],
      links: [
        ...actual.links,
        {
          id: '3',
          a: { device: 'b', port: 'Gi1/0/3' },
          b: { device: 'd', port: 'Gi1/0/24' },
          speed: 1000,
        },
      ],
    }
    expect(diagramDiffs(actual, real)).toEqual([
      { kind: 'missing-device', device: 'SW4', attachedTo: 'SW2', port: 'Gi1/0/3' },
    ])
  })
})
