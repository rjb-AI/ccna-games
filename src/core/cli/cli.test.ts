import { describe, expect, it } from 'vitest'
import { newSwitch } from '../device/state'
import { COMMANDS } from './commands'
import { expandIfRange, parseIfName, shortIfName } from './ifname'
import { nextWords, parseLine, parseVlanList } from './parser'
import { type CliLevel, execute, promptOf, replay, startSession } from './session'

const PORTS = Array.from({ length: 8 }, (_, i) => `GigabitEthernet1/0/${i + 1}`)
const sw = (kind: 'switch' | 'l3switch' = 'l3switch') =>
  newSwitch({ hostname: 'SW1', kind, mac: '0011.2233.4401', ports: PORTS, poe: true })
const ALL: CliLevel = { allowed: new Set(COMMANDS.map((c) => c.id)) }

/** Run lines from privileged EXEC and return the final session and transcript. */
function run(lines: string[], level = ALL, kind: 'switch' | 'l3switch' = 'l3switch') {
  return replay(startSession(sw(kind)), lines, level)
}

describe('interface names', () => {
  it.each([
    ['gi1/0/1', 'GigabitEthernet1/0/1'],
    ['g1/0/1', 'GigabitEthernet1/0/1'],
    ['GigabitEthernet1/0/1', 'GigabitEthernet1/0/1'],
    ['te1/1/1', 'TenGigabitEthernet1/1/1'],
    ['po1', 'Port-channel1'],
    ['vlan20', 'Vlan20'],
    ['lo0', 'Loopback0'],
  ])('%s -> %s', (typed, full) => {
    const r = parseIfName([typed])
    expect(r.ok && r.name).toBe(full)
  })

  it('accepts a space before the number', () => {
    const r = parseIfName(['gi', '1/0/2'])
    expect(r.ok && r.name).toBe('GigabitEthernet1/0/2')
    expect(r.used).toBe(2)
  })

  it('t and tw are ambiguous, as on a real Catalyst', () => {
    expect(parseIfName(['t1/0/1'])).toMatchObject({ ok: false, error: 'ambiguous' })
    expect(parseIfName(['tw1/0/1'])).toMatchObject({ ok: false, error: 'ambiguous' })
  })

  it('short names for output', () => {
    expect(shortIfName('GigabitEthernet1/0/10')).toBe('Gi1/0/10')
    expect(shortIfName('Port-channel1')).toBe('Po1')
    expect(shortIfName('TwentyFiveGigE1/1/1')).toBe('Twe1/1/1')
  })

  it('interface ranges', () => {
    expect(expandIfRange('gi1/0/1 - 3, gi1/0/8')).toEqual([
      'GigabitEthernet1/0/1',
      'GigabitEthernet1/0/2',
      'GigabitEthernet1/0/3',
      'GigabitEthernet1/0/8',
    ])
    expect(expandIfRange('gi1/0/3 - 1')).toBeNull()
  })

  it('VLAN lists', () => {
    expect(parseVlanList('10,20-22')).toEqual([10, 20, 21, 22])
    expect(parseVlanList('0')).toBeNull()
    expect(parseVlanList('4095')).toBeNull()
  })
})

describe('modes and prompts', () => {
  it('walks user -> exec -> config -> config-if -> config and back with end', () => {
    let s = startSession(sw(), 'user')
    expect(promptOf(s)).toBe('SW1>')
    for (const [line, prompt] of [
      ['en', 'SW1#'],
      ['conf t', 'SW1(config)#'],
      ['int gi1/0/1', 'SW1(config-if)#'],
      ['exit', 'SW1(config)#'],
      ['vlan 10', 'SW1(config-vlan)#'],
      ['end', 'SW1#'],
      ['disable', 'SW1>'],
    ] as const) {
      s = execute(s, line, ALL).session
      expect(promptOf(s), line).toBe(prompt)
    }
  })

  it('configure terminal prints the real banner', () => {
    const { transcript } = run(['configure terminal'])
    expect(transcript[0]?.output).toEqual([
      'Enter configuration commands, one per line.  End with CNTL/Z.',
    ])
  })

  it('a global command in interface mode drops back to global config, as on IOS', () => {
    const { session } = run(['conf t', 'int gi1/0/1', 'vlan 30'])
    expect(session.mode).toBe('config-vlan')
    expect(session.state.vlans[30]).toBe('VLAN0030')
  })

  it('interface range selects every port', () => {
    const { session } = run(['conf t', 'int range gi1/0/1 - 3', 'sw mode acc', 'sw acc vlan 10'])
    expect(session.mode).toBe('config-if-range')
    for (const n of [1, 2, 3]) {
      const i = session.state.interfaces[`GigabitEthernet1/0/${n}`]
      expect(i?.mode).toBe('access')
      expect(i?.accessVlan).toBe(10)
    }
    expect(session.state.interfaces['GigabitEthernet1/0/4']?.mode).toBe('dynamic-auto')
  })
})

describe('errors follow the real IOS messages', () => {
  it('invalid input puts the caret under the bad word', () => {
    const { transcript } = run(['conf t', 'interface gi1/0/1', 'swithport mode access'])
    const e = transcript[2]
    expect(e?.output).toEqual([
      `${' '.repeat('SW1(config-if)#'.length)}^`,
      "% Invalid input detected at '^' marker.",
    ])
  })

  it('caret moves to the word that failed', () => {
    const { transcript } = run(['conf t', 'interface gi1/0/1', 'switchport mode acces5'])
    const caret = transcript[2]?.output[0] ?? ''
    expect(caret.indexOf('^')).toBe('SW1(config-if)#'.length + 'switchport mode '.length)
  })

  it('incomplete command', () => {
    const { transcript } = run(['conf t', 'interface gi1/0/1', 'switchport access vlan'])
    expect(transcript[2]?.output).toEqual(['% Incomplete command.'])
  })

  it('ambiguous command quotes what was typed', () => {
    const { transcript } = run(['conf t', 'interface gi1/0/1', 's'])
    expect(transcript[2]?.output).toEqual(['% Ambiguous command: "s"'])
  })

  it('a config command in EXEC mode is invalid input', () => {
    const { transcript } = run(['switchport mode access'])
    expect(transcript[0]?.output[1]).toBe("% Invalid input detected at '^' marker.")
  })

  it('an EXEC command in config mode is invalid (use do)', () => {
    const { transcript } = run(['conf t', 'show vlan brief'])
    expect(transcript[1]?.output[1]).toBe("% Invalid input detected at '^' marker.")
  })

  it('a real command the level does not use says so, as a game note', () => {
    const { transcript } = run(['conf t', 'interface gi1/0/1', 'speed 100'])
    expect(transcript[2]?.output).toEqual([])
    expect(transcript[2]?.notes[0]).toMatch(/real.*level/)
  })

  it('commands outside the level are refused without changing anything', () => {
    const level: CliLevel = { allowed: new Set(['exec.configure', 'config.interface']) }
    const { session, transcript } = run(['conf t', 'int gi1/0/1', 'shutdown'], level)
    expect(transcript[2]?.notes[0]).toMatch(/level/)
    expect(session.state.interfaces['GigabitEthernet1/0/1']?.shutdown).toBe(false)
  })
})

describe('short and long forms change the state the same way', () => {
  const pairs: [string[], string[]][] = [
    [
      [
        'configure terminal',
        'vlan 20',
        'interface GigabitEthernet1/0/2',
        'switchport mode access',
        'switchport access vlan 20',
      ],
      ['conf t', 'vl 20', 'int g1/0/2', 'sw mo acc', 'sw acc vl 20'],
    ],
    [
      [
        'configure terminal',
        'interface GigabitEthernet1/0/2',
        'switchport mode trunk',
        'switchport trunk native vlan 99',
        'switchport trunk allowed vlan 10,20,99',
      ],
      ['conf t', 'int gi 1/0/2', 'sw mode tr', 'sw tr nat vl 99', 'sw tr all vl 10,20,99'],
    ],
    [
      [
        'configure terminal',
        'vlan 150',
        'interface GigabitEthernet1/0/3',
        'switchport voice vlan 150',
        'spanning-tree portfast',
        'spanning-tree bpduguard enable',
      ],
      [
        'conf t',
        'vlan 150',
        'int gi1/0/3',
        'sw vo vl 150',
        'spanning-tree portf',
        'spanning-tree bpdug en',
      ],
    ],
    [
      [
        'configure terminal',
        'interface range GigabitEthernet1/0/5 - 6',
        'channel-group 1 mode active',
      ],
      ['conf t', 'int ra gi1/0/5 - 6', 'channel-g 1 mo ac'],
    ],
    [
      [
        'configure terminal',
        'ip routing',
        'interface Vlan20',
        'ip address 10.0.20.1 255.255.255.0',
        'no shutdown',
      ],
      ['conf t', 'ip routi', 'int vl20', 'ip add 10.0.20.1 255.255.255.0', 'no sh'],
    ],
    [
      [
        'configure terminal',
        'ip route 0.0.0.0 0.0.0.0 10.0.0.1',
        'ip route 0.0.0.0 0.0.0.0 10.0.1.1 200',
      ],
      ['conf t', 'ip route 0.0.0.0 0.0.0.0 10.0.0.1', 'ip route 0.0.0.0 0.0.0.0 10.0.1.1 200'],
    ],
    [
      ['configure terminal', 'spanning-tree vlan 10 priority 4096'],
      ['conf t', 'span vlan 10 pri 4096'],
    ],
    [
      ['configure terminal', 'interface GigabitEthernet1/0/4', 'power inline never'],
      ['conf t', 'int gi1/0/4', 'pow inl nev'],
    ],
  ]
  it.each(pairs)('%j', (long, short) => {
    const a = run(long).session
    const b = run(short).session
    for (const t of [...run(long).transcript, ...run(short).transcript]) {
      expect(t.output.join('\n'), t.input).not.toMatch(/^%/m)
    }
    expect(b.state).toEqual(a.state)
  })

  it('"ip rou" is ambiguous (route, routing), as on IOS; "ip routi" is routing', () => {
    expect(run(['conf t', 'ip rou']).transcript[1]?.output).toEqual([
      '% Ambiguous command: "ip rou"',
    ])
    expect(run(['conf t', 'ip routi']).session.state.ipRouting).toBe(true)
  })
})

describe('behaviour', () => {
  it('no forms undo settings', () => {
    const { session } = run([
      'conf t',
      'int gi1/0/1',
      'sw voice vlan 150',
      'no sw voice vlan',
      'shutdown',
      'no shutdown',
      'sw trunk allowed vlan 10',
      'no sw trunk allowed vlan',
    ])
    const i = session.state.interfaces['GigabitEthernet1/0/1']
    expect(i?.voiceVlan).toBeNull()
    expect(i?.shutdown).toBe(false)
    expect(i?.allowedVlans).toBe('all')
  })

  it('allowed vlan add and remove', () => {
    const { session } = run([
      'conf t',
      'int gi1/0/1',
      'sw tr allowed vlan 10,20',
      'sw tr allowed vlan add 30',
      'sw tr allowed vlan remove 10',
    ])
    expect(session.state.interfaces['GigabitEthernet1/0/1']?.allowedVlans).toEqual([20, 30])
  })

  it('access VLAN that does not exist is created, with the real IOS message', () => {
    const { session, transcript } = run(['conf t', 'int gi1/0/1', 'sw acc vlan 40'])
    expect(session.state.vlans[40]).toBe('VLAN0040')
    expect(transcript[2]?.output).toEqual(['% Access VLAN does not exist. Creating vlan 40'])
  })

  it('a voice VLAN turns PortFast on', () => {
    const { session } = run(['conf t', 'vlan 150', 'int gi1/0/1', 'sw voice vlan 150'])
    expect(session.state.interfaces['GigabitEthernet1/0/1']?.portfast).toBe(true)
  })

  it('VLAN names', () => {
    const { session } = run(['conf t', 'vlan 10', 'name SALES', 'exit', 'vlan 20,30'])
    expect(session.state.vlans).toMatchObject({ 1: 'default', 10: 'SALES', 20: 'VLAN0020' })
  })

  it('channel-group creates the port-channel and refuses mixed protocols', () => {
    const { session, transcript } = run([
      'conf t',
      'int range gi1/0/5 - 6',
      'channel-group 1 mode active',
      'int gi1/0/7',
      'channel-group 1 mode desirable',
    ])
    expect(session.state.interfaces['Port-channel1']).toBeDefined()
    expect(session.state.interfaces['GigabitEthernet1/0/7']?.channelGroup).toBeNull()
    expect(transcript[4]?.notes[0]).toMatch(/same protocol/)
  })

  it('port-channel settings are copied to members', () => {
    const { session } = run([
      'conf t',
      'int range gi1/0/5 - 6',
      'channel-group 2 mode active',
      'int po2',
      'sw mode trunk',
    ])
    expect(session.state.interfaces['GigabitEthernet1/0/5']?.mode).toBe('trunk')
    expect(session.state.interfaces['GigabitEthernet1/0/6']?.mode).toBe('trunk')
  })

  it('STP priority must be a multiple of 4096', () => {
    const { session, transcript } = run(['conf t', 'spanning-tree vlan 10 priority 5000'])
    expect(session.state.stpPriority[10]).toBeUndefined()
    expect(transcript[1]?.notes[0]).toMatch(/4096/)
  })

  it('root primary uses the current root priority', () => {
    const level: CliLevel = {
      ...ALL,
      network: { rootPriority: { 10: 24576 }, rootIsSelf: [] },
    }
    const { session } = run(['conf t', 'spanning-tree vlan 10 root primary'], level)
    expect(session.state.stpPriority[10]).toBe(20480)
  })

  it('no switchport needs a multilayer switch', () => {
    const r = run(['conf t', 'int gi1/0/1', 'no switchport'], ALL, 'switch')
    expect(r.transcript[2]?.output).toEqual(['% Incomplete command.'])
    expect(r.session.state.interfaces['GigabitEthernet1/0/1']?.switchport).toBe(true)
  })

  it('an IP address on a Layer 2 port is refused with a note', () => {
    const { session, transcript } = run([
      'conf t',
      'int gi1/0/1',
      'ip address 10.0.0.1 255.255.255.0',
    ])
    expect(session.state.interfaces['GigabitEthernet1/0/1']?.ipv4).toBeNull()
    expect(transcript[2]?.notes[0]).toMatch(/Layer 2/)
  })

  it('do runs EXEC commands from config mode and stays in the mode', () => {
    const { session, transcript } = run(['conf t', 'int gi1/0/1', 'do show ip interface brief'])
    expect(session.mode).toBe('config-if')
    expect(transcript[2]?.output[0]).toMatch(/^Interface/)
  })

  it('static routes, floating routes and removal', () => {
    const { session } = run([
      'conf t',
      'ip route 10.1.0.0 255.255.0.0 10.0.0.2',
      'ip route 10.1.0.0 255.255.0.0 10.0.1.2 200',
      'ipv6 route 2001:db8:1::/48 2001:db8::2',
      'no ip route 10.1.0.0 255.255.0.0 10.0.0.2',
    ])
    expect(session.state.staticRoutes.map((r) => r.distance)).toEqual([200, 1])
  })
})

describe('helpers for the phone keyboard', () => {
  const allowed = new Set(COMMANDS.map((c) => c.id))
  it('suggests next keywords', () => {
    const words = nextWords('switchport ', 'config-if', COMMANDS, 'l3switch', allowed).map(
      (w) => w.word,
    )
    expect(words).toEqual(expect.arrayContaining(['mode', 'access', 'voice', 'trunk']))
  })

  it('suggests an argument label after a keyword that needs one', () => {
    const words = nextWords('switchport access vlan ', 'config-if', COMMANDS, 'l3switch', allowed)
    expect(words[0]?.isArg).toBe(true)
  })

  it('only suggests commands the level allows', () => {
    const words = nextWords('', 'config-if', COMMANDS, 'l3switch', new Set(['if.shutdown'])).map(
      (w) => w.word,
    )
    expect(words).toEqual(expect.arrayContaining(['shutdown', 'no']))
    expect(words).not.toContain('switchport')
  })

  it('every catalogue command parses in its own mode with its own words', () => {
    for (const d of COMMANDS) {
      const words = d.pattern.map((t) => ('kw' in t ? t.kw : sampleArg(t.arg)))
      const line = `${d.negatedOnly ? 'no ' : ''}${words.join(' ')}`
      const r = parseLine(line, d.modes[0] as never, COMMANDS, 'l3switch')
      expect(r.ok, `${d.id}: ${words.join(' ')}`).toBe(true)
    }
  })
})

function sampleArg(a: string): string {
  return (
    {
      number: '1',
      'vlan-list': '10',
      iface: 'gi1/0/1',
      'iface-range': 'gi1/0/1 - 2',
      ipv4: '10.0.0.1',
      ipv6: '2001:db8::1',
      'ipv6-prefix': '2001:db8::/32',
      word: 'X',
      text: 'some text',
    } as Record<string, string>
  )[a] as string
}

describe('audit fixes', () => {
  it('the caret after "do" sits under the bad word on the config line', () => {
    const { transcript } = run(['conf t', 'do show vlan brif'])
    const caret = transcript[1]?.output[0] ?? ''
    expect(caret.indexOf('^')).toBe('SW1(config)#'.length + 'do show vlan '.length)
  })

  it('no ip route NET MASK removes every route to the prefix', () => {
    const { session, transcript } = run([
      'conf t',
      'ip route 10.1.0.0 255.255.0.0 10.0.0.2',
      'ip route 10.1.0.0 255.255.0.0 10.0.1.2 200',
      'no ip route 10.1.0.0 255.255.0.0',
    ])
    expect(transcript[3]?.output).toEqual([])
    expect(session.state.staticRoutes).toEqual([])
  })

  it('"ip route NET MASK" without "no" is still incomplete', () => {
    expect(run(['conf t', 'ip route 10.1.0.0 255.255.0.0']).transcript[1]?.output).toEqual([
      '% Incomplete command.',
    ])
  })

  it('abbreviations after "no" are judged like any other', () => {
    // "sp" could be spanning-tree or speed.
    expect(run(['conf t', 'int g1/0/1', 'no sp portfast']).transcript[2]?.output).toEqual([
      '% Ambiguous command: "no sp portfast"',
    ])
    // "n" is "no" in interface mode (nothing else there starts with n).
    const r = run(['conf t', 'int g1/0/1', 'shutdown', 'n shutdown'])
    expect(r.session.state.interfaces['GigabitEthernet1/0/1']?.shutdown).toBe(false)
  })

  it('a real global command from a sub-mode says "not in this level", not invalid input', () => {
    const { transcript } = run(['conf t', 'int g1/0/1', 'router ospf 1'])
    expect(transcript[2]?.output).toEqual([])
    expect(transcript[2]?.notes[0]).toMatch(/level/)
  })

  it('interface range works with port-channels and refuses huge or subinterface ranges', () => {
    expect(expandIfRange('port-channel1 - 2')).toEqual(['Port-channel1', 'Port-channel2'])
    expect(expandIfRange('gi1/0/1 - 5000000')).toBeNull()
    expect(expandIfRange('gi1/0/1.5 - 3')).toBeNull()
  })

  it('VLAN 1 keeps its name; 1002-1005 cannot be created or deleted', () => {
    const r = run(['conf t', 'vlan 1', 'name X', 'exit', 'vlan 1003', 'no vlan 1002'])
    expect(r.session.state.vlans[1]).toBe('default')
    expect(r.session.state.vlans[1003]).toBeUndefined()
    expect(r.transcript[2]?.notes[0]).toMatch(/default VLAN/)
    expect(r.transcript[4]?.notes[0]).toMatch(/reserved/)
  })

  it('switchport settings on a port-channel copy to members; other commands do not', () => {
    const { session } = run([
      'conf t',
      'int range gi1/0/5 - 6',
      'channel-group 2 mode active',
      'int gi1/0/6',
      'sw trunk native vlan 99',
      'int po2',
      'description uplink',
    ])
    expect(session.state.interfaces['GigabitEthernet1/0/6']?.nativeVlan).toBe(99)
  })

  it('a voice VLAN that does not exist is created with a note, not an IOS message', () => {
    const { transcript } = run(['conf t', 'int g1/0/1', 'sw voice vlan 150'])
    expect(transcript[2]?.output).toEqual([])
    expect(transcript[2]?.notes[0]).toMatch(/created/)
  })
})
