/**
 * The command catalogue: every command the mini command line knows, what it does to the device
 * state, and which modes accept it. Levels allow a subset by id.
 *
 * Behaviour sources (Cisco Catalyst 9300 IOS XE configuration guides and command references)
 * are collected with quotes in reference/facts/cli-switch-facts.md.
 */
import { DEFAULT_STP_PRIORITY } from '../device'
import {
  type ChannelMode,
  type DeviceState,
  type Interface,
  type StaticRoute,
  type VlanSet,
  cloneState,
  defaultVlanName,
  isReservedVlan,
  newInterface,
  toVlanSet,
  vlanList,
} from '../device/state'
import { broadcastOf, formatIPv4, maskToPrefix, networkOf, parseIPv4 } from '../netmath'
import { parseIPv6 } from '../netmath/ipv6'
import { copyL2Settings, l2Key } from '../sim/l2/etherchannel'
import { type Args, type CommandDef, type RunContext, type RunResult, arg, kw } from './grammar'
import { shortIfName } from './ifname'
import { SHOW_COMMANDS } from './show'

const CONFIG_SUB = [
  'config-if',
  'config-if-range',
  'config-vlan',
  'config-line',
  'config-router',
] as const
const IF_MODES = ['config-if', 'config-if-range'] as const

function withoutKeys<T>(rec: Record<number, T>, keys: readonly number[]): Record<number, T> {
  return Object.fromEntries(Object.entries(rec).filter(([k]) => !keys.includes(Number(k))))
}

/** Apply a change to every selected interface. */
function eachSelected(
  ctx: RunContext,
  change: (i: Interface, state: DeviceState) => string | undefined,
): RunResult {
  const state = cloneState(ctx.state)
  const notes: string[] = []
  for (const name of ctx.selected) {
    const i = state.interfaces[name]
    if (!i) continue
    const before = l2Key(i)
    const note = change(i, state)
    if (note) notes.push(note)
    // Switchport changes on a port-channel interface are copied to its member ports, as on IOS.
    // Other commands (description, shutdown...) leave the members alone.
    if (i.kind === 'port-channel' && l2Key(i) !== before) {
      const group = Number(name.replace('Port-channel', ''))
      for (const m of Object.values(state.interfaces)) {
        if (m.channelGroup?.id === group) copyL2Settings(i, m)
      }
    }
  }
  const unique = [...new Set(notes)]
  // Lines starting with "%" are real device messages; everything else is a game note.
  return {
    state,
    output: unique.filter((n) => n.startsWith('%')),
    notes: unique.filter((n) => !n.startsWith('%')),
  }
}

/** Switchport-only commands refuse routed ports and SVIs with a game note. */
function l2Only(change: (i: Interface, state: DeviceState) => string | undefined) {
  return (i: Interface, state: DeviceState) => {
    if (!i.switchport) {
      return `${shortIfName(i.name)} is not a switchport, so switchport settings don't apply. On a routed port, "switchport" turns it back into a Layer 2 port.`
    }
    return change(i, state)
  }
}

function ensureVlan(state: DeviceState, vlan: number): boolean {
  if (vlan in state.vlans) return false
  state.vlans[vlan] = defaultVlanName(vlan)
  return true
}

/** Real IOS XE message (Catalyst 9300 Layer 2 guide; reference/facts/cli-switch-facts.md 19). */
const ACCESS_VLAN_CREATED = (v: number) => `% Access VLAN does not exist. Creating vlan ${v}`

export const COMMANDS: readonly CommandDef[] = [
  // ---- Modes ----
  {
    id: 'exec.enable',
    modes: ['user'],
    pattern: [kw('enable')],
    help: 'Go to privileged EXEC mode',
    run: () => ({ mode: 'exec' }),
  },
  {
    id: 'exec.disable',
    modes: ['exec'],
    pattern: [kw('disable')],
    help: 'Back to user EXEC mode',
    run: () => ({ mode: 'user' }),
  },
  {
    id: 'exec.configure',
    modes: ['exec'],
    pattern: [kw('configure'), kw('terminal')],
    help: 'Enter global configuration mode',
    // Banner text: Catalyst 9300 IP Routing guide HTML (two spaces before "End"); see
    // reference/facts/cli-switch-facts.md item 5. Some PDFs collapse the double space.
    run: () => ({
      mode: 'config',
      output: ['Enter configuration commands, one per line.  End with CNTL/Z.'],
    }),
  },
  {
    id: 'mode.exit',
    modes: ['user', 'exec', 'config', ...CONFIG_SUB],
    pattern: [kw('exit')],
    help: 'Leave this mode',
    run: (ctx) => {
      if (ctx.mode === 'user' || ctx.mode === 'exec')
        return { notes: ['Logging out is turned off in this game.'] }
      if (ctx.mode === 'config') return { mode: 'exec', selected: [], vlansSelected: [] }
      return { mode: 'config', selected: [], vlansSelected: [] }
    },
  },
  {
    id: 'mode.end',
    modes: ['config', ...CONFIG_SUB],
    pattern: [kw('end')],
    help: 'Back to privileged EXEC mode',
    run: () => ({ mode: 'exec', selected: [], vlansSelected: [] }),
  },

  // ---- Global configuration ----
  {
    id: 'config.hostname',
    modes: ['config'],
    pattern: [kw('hostname'), arg('word', 'name')],
    help: 'Set the device name',
    run: (ctx, a) => {
      const state = cloneState(ctx.state)
      state.hostname = a.name as string
      return { state }
    },
  },
  {
    id: 'config.vlan',
    modes: ['config', 'config-vlan'],
    pattern: [kw('vlan'), arg('vlan-list', 'vlans')],
    negatable: true,
    help: 'Create VLANs and enter VLAN configuration mode',
    run: (ctx, a, negated) => {
      const state = cloneState(ctx.state)
      const vlans = a.vlans as number[]
      const fixed = vlans.filter((v) => v === 1 || isReservedVlan(v))
      if (negated) {
        state.vlans = withoutKeys(
          state.vlans,
          vlans.filter((v) => !fixed.includes(v)),
        )
        const notes = fixed.length
          ? [`VLAN ${fixed.join(', ')} is a default VLAN and can't be deleted.`]
          : []
        return { state, notes }
      }
      if (fixed.some(isReservedVlan))
        return {
          notes: ['VLANs 1002-1005 are reserved defaults (old FDDI and Token Ring); pick another.'],
        }
      for (const v of vlans) ensureVlan(state, v)
      return { state, mode: 'config-vlan', vlansSelected: vlans, selected: [] }
    },
  },
  {
    id: 'vlan.name',
    modes: ['config-vlan'],
    pattern: [kw('name'), arg('word', 'name')],
    negatable: true,
    noPattern: [kw('name')],
    help: 'Name the VLAN',
    run: (ctx, a, negated) => {
      const state = cloneState(ctx.state)
      const notes: string[] = []
      for (const v of ctx.vlansSelected) {
        if (v === 1) notes.push('VLAN 1 is the default VLAN; its name can’t be changed.')
        else state.vlans[v] = negated ? defaultVlanName(v) : (a.name as string)
      }
      return { state, notes }
    },
  },
  {
    id: 'config.interface',
    modes: ['config', ...CONFIG_SUB],
    pattern: [kw('interface'), arg('iface', 'name')],
    help: 'Configure one interface',
    run: (ctx, a) => {
      const name = a.name as string
      const state = cloneState(ctx.state)
      if (!state.interfaces[name]) {
        // Logical interfaces are created on first use; physical ports must exist.
        const kind = name.startsWith('Vlan')
          ? 'svi'
          : name.startsWith('Port-channel')
            ? 'port-channel'
            : name.startsWith('Loopback')
              ? 'loopback'
              : null
        if (!kind) return { notes: [`This switch has no ${name}.`] }
        if (kind === 'svi' && ctx.state.kind === 'switch') {
          // A Layer 2-only switch still has SVIs (for management); allowed.
        }
        state.interfaces[name] = newInterface(name, kind)
      }
      return { state, mode: 'config-if', selected: [name], vlansSelected: [] }
    },
  },
  {
    id: 'config.interface-range',
    modes: ['config', ...CONFIG_SUB],
    pattern: [kw('interface'), kw('range'), arg('iface-range', 'names')],
    help: 'Configure several interfaces at once',
    run: (ctx, a) => {
      const names = a.names as string[]
      const missing = names.filter((n) => !ctx.state.interfaces[n])
      if (missing.length) return { notes: [`This switch has no ${missing[0]}.`] }
      return { mode: 'config-if-range', selected: names, vlansSelected: [] }
    },
  },
  {
    id: 'config.ip-routing',
    modes: ['config'],
    pattern: [kw('ip'), kw('routing')],
    negatable: true,
    kinds: ['l3switch', 'router'],
    help: 'Route between networks (needed for inter-VLAN routing)',
    run: (ctx, _a, negated) => {
      const state = cloneState(ctx.state)
      state.ipRouting = !negated
      return { state }
    },
  },
  {
    id: 'config.ipv6-routing',
    modes: ['config'],
    pattern: [kw('ipv6'), kw('unicast-routing')],
    negatable: true,
    kinds: ['l3switch', 'router'],
    help: 'Route IPv6',
    run: (ctx, _a, negated) => {
      const state = cloneState(ctx.state)
      state.ipv6Routing = !negated
      return { state }
    },
  },
  ...staticRouteCommands(),
  {
    id: 'config.stp-priority',
    modes: ['config'],
    pattern: [
      kw('spanning-tree'),
      kw('vlan'),
      arg('vlan-list', 'vlans'),
      kw('priority'),
      arg('number', 'priority', [0, 61440]),
    ],
    negatable: true,
    noPattern: [kw('spanning-tree'), kw('vlan'), arg('vlan-list', 'vlans'), kw('priority')],
    help: 'Set the bridge priority for VLANs',
    run: (ctx, a, negated) => {
      const p = a.priority as number
      if (!negated && p % 4096 !== 0) {
        return {
          notes: [
            `The priority must be a multiple of 4096 (0, 4096, 8192 … 61440). ${p} isn't, so nothing changed.`,
          ],
        }
      }
      const state = cloneState(ctx.state)
      const vlans = a.vlans as number[]
      if (negated) state.stpPriority = withoutKeys(state.stpPriority, vlans)
      else for (const v of vlans) state.stpPriority[v] = p
      return { state }
    },
  },
  ...(['primary', 'secondary'] as const).map((role): CommandDef => ({
    id: 'config.stp-root',
    modes: ['config'],
    pattern: [kw('spanning-tree'), kw('vlan'), arg('vlan-list', 'vlans'), kw('root'), kw(role)],
    help:
      role === 'primary' ? 'Make this switch the root bridge' : 'Make this switch the backup root',
    run: (ctx, a) => {
      const state = cloneState(ctx.state)
      for (const v of a.vlans as number[]) state.stpPriority[v] = rootMacroPriority(ctx, v, role)
      return { state }
    },
  })),

  // ---- Interface configuration ----
  {
    id: 'if.description',
    modes: IF_MODES,
    pattern: [kw('description'), arg('text', 'text')],
    negatable: true,
    noPattern: [kw('description')],
    help: 'Describe the interface',
    run: (ctx, a, negated) =>
      eachSelected(ctx, (i) => {
        i.description = negated ? null : (a.text as string)
      }),
  },
  {
    id: 'if.shutdown',
    modes: IF_MODES,
    pattern: [kw('shutdown')],
    negatable: true,
    help: 'Turn the interface off ("no shutdown" turns it on)',
    run: (ctx, _a, negated) =>
      eachSelected(ctx, (i) => {
        i.shutdown = !negated
      }),
  },
  {
    id: 'if.switchport',
    modes: IF_MODES,
    pattern: [kw('switchport')],
    negatable: true,
    kinds: ['l3switch'],
    help: '"no switchport" makes a routed port; "switchport" makes it Layer 2 again',
    run: (ctx, _a, negated) =>
      eachSelected(ctx, (i) => {
        if (i.kind !== 'ethernet' && i.kind !== 'port-channel')
          return 'Only physical ports and port-channels can be switchports.'
        i.switchport = !negated
        if (!negated) i.ipv4 = null
      }),
  },
  ...(['access', 'trunk'] as const).map((mode): CommandDef => ({
    id: `if.switchport.mode-${mode}`,
    modes: IF_MODES,
    pattern: [kw('switchport'), kw('mode'), kw(mode)],
    help: mode === 'access' ? 'One VLAN, for an end device' : 'Carry many VLANs, tagged',
    run: (ctx) =>
      eachSelected(
        ctx,
        l2Only((i) => {
          i.mode = mode
        }),
      ),
  })),
  ...(['auto', 'desirable'] as const).map((d): CommandDef => ({
    id: `if.switchport.mode-dynamic-${d}`,
    modes: IF_MODES,
    pattern: [kw('switchport'), kw('mode'), kw('dynamic'), kw(d)],
    help: `Negotiate trunking with DTP (${d})`,
    run: (ctx) =>
      eachSelected(
        ctx,
        l2Only((i) => {
          i.mode = `dynamic-${d}`
        }),
      ),
  })),
  {
    id: 'if.switchport.access-vlan',
    modes: IF_MODES,
    pattern: [kw('switchport'), kw('access'), kw('vlan'), arg('number', 'vlan', [1, 4094])],
    negatable: true,
    noPattern: [kw('switchport'), kw('access'), kw('vlan')],
    help: 'The VLAN for an access port',
    run: (ctx, a, negated) =>
      eachSelected(
        ctx,
        l2Only((i, state) => {
          const v = negated ? 1 : (a.vlan as number)
          i.accessVlan = v
          if (ensureVlan(state, v)) return ACCESS_VLAN_CREATED(v)
        }),
      ),
  },
  {
    id: 'if.switchport.voice-vlan',
    modes: IF_MODES,
    pattern: [kw('switchport'), kw('voice'), kw('vlan'), arg('number', 'vlan', [1, 4094])],
    negatable: true,
    noPattern: [kw('switchport'), kw('voice'), kw('vlan')],
    help: 'The VLAN for an IP phone on this port',
    run: (ctx, a, negated) =>
      eachSelected(
        ctx,
        l2Only((i, state) => {
          i.voiceVlan = negated ? null : (a.vlan as number)
          // Configuring a voice VLAN turns PortFast on (Catalyst 9300 VLAN guide; facts item 23).
          if (!negated) i.portfast = true
          // No real sample of what IOS prints here, so a game note rather than a % message.
          if (!negated && ensureVlan(state, a.vlan as number))
            return `VLAN ${a.vlan as number} didn't exist, so the switch created it.`
        }),
      ),
  },
  {
    id: 'if.switchport.trunk-native',
    modes: IF_MODES,
    pattern: [
      kw('switchport'),
      kw('trunk'),
      kw('native'),
      kw('vlan'),
      arg('number', 'vlan', [1, 4094]),
    ],
    negatable: true,
    noPattern: [kw('switchport'), kw('trunk'), kw('native'), kw('vlan')],
    help: 'The untagged (native) VLAN on a trunk',
    run: (ctx, a, negated) =>
      eachSelected(
        ctx,
        l2Only((i) => {
          i.nativeVlan = negated ? 1 : (a.vlan as number)
        }),
      ),
  },
  ...allowedVlanCommands(),
  ...(['active', 'passive', 'desirable', 'auto', 'on'] as const).map((mode): CommandDef => ({
    // "on" has its own id: levels that show etherchannel summary leave it out (no real sample
    // of an "on" group's row yet).
    id: mode === 'on' ? 'if.channel-group-on' : 'if.channel-group',
    modes: IF_MODES,
    pattern: [kw('channel-group'), arg('number', 'group', [1, 128]), kw('mode'), kw(mode)],
    negatable: true,
    noPattern: [kw('channel-group')],
    help: `Add the port to an EtherChannel (${protocolName(mode)}, ${mode})`,
    run: (ctx, a, negated) => channelGroup(ctx, negated ? null : { id: a.group as number, mode }),
  })),
  {
    id: 'if.portfast',
    modes: IF_MODES,
    pattern: [kw('spanning-tree'), kw('portfast')],
    negatable: true,
    help: 'Edge port: skip listening and learning (end devices only)',
    run: (ctx, _a, negated) =>
      eachSelected(ctx, (i) => {
        i.portfast = !negated
      }),
  },
  ...(['enable', 'disable'] as const).map((st): CommandDef => ({
    id: 'if.bpduguard',
    modes: IF_MODES,
    pattern: [kw('spanning-tree'), kw('bpduguard'), kw(st)],
    help: st === 'enable' ? 'Shut the port if a BPDU arrives' : 'Turn BPDU guard off',
    run: (ctx) =>
      eachSelected(ctx, (i) => {
        i.bpduGuard = st === 'enable'
      }),
  })),
  ...(['auto', 'never'] as const).map((p): CommandDef => ({
    id: `if.power-inline-${p}`,
    modes: IF_MODES,
    pattern: [kw('power'), kw('inline'), kw(p)],
    help: p === 'auto' ? 'Power a PoE device that asks for it' : 'Never give PoE on this port',
    run: (ctx) =>
      eachSelected(ctx, (i) => {
        if (i.powerInline === null) return `${shortIfName(i.name)} has no PoE.`
        i.powerInline = p
      }),
  })),
  {
    id: 'if.ip-address',
    modes: IF_MODES,
    pattern: [kw('ip'), kw('address'), arg('ipv4', 'address'), arg('ipv4', 'mask')],
    negatable: true,
    noPattern: [kw('ip'), kw('address')],
    help: 'Give the interface an IPv4 address',
    run: (ctx, a, negated) =>
      eachSelected(ctx, (i) => {
        if (i.switchport)
          return `${shortIfName(i.name)} is a Layer 2 port. Put the address on an SVI (interface vlan N) or make the port routed with "no switchport".`
        if (negated) {
          i.ipv4 = null
          return
        }
        const mask = parseIPv4(a.mask as string) as number
        const prefix = maskToPrefix(mask)
        if (prefix === null) return `${a.mask as string} is not a valid subnet mask.`
        const address = parseIPv4(a.address as string) as number
        // An interface needs a host address: not the subnet's network or broadcast address
        // (except on /31 and /32, which have no network/broadcast).
        if (
          prefix <= 30 &&
          (address === networkOf(address, prefix) || address === broadcastOf(address, prefix))
        )
          return `${a.address as string} is the ${address === networkOf(address, prefix) ? 'network' : 'broadcast'} address of its subnet; an interface needs a host address.`
        i.ipv4 = { address, mask }
        i.ipMethod = 'manual'
      }),
  },

  // ---- do ----
  {
    id: 'config.do',
    modes: ['config', ...CONFIG_SUB],
    pattern: [kw('do'), arg('text', 'line')],
    help: 'Run an EXEC command (like show) without leaving config mode',
    // Handled by the session (it re-parses the rest of the line in EXEC mode).
    run: () => ({}),
  },

  ...SHOW_COMMANDS,
]

function channelGroup(ctx: RunContext, cg: { id: number; mode: ChannelMode } | null): RunResult {
  if (!cg) {
    return eachSelected(ctx, (i) => {
      i.channelGroup = null
    })
  }
  const { id: group, mode } = cg
  const r = eachSelected(ctx, (i, state) => {
    if (i.kind !== 'ethernet') return 'Only physical ports can join a channel group.'
    const clash = Object.values(state.interfaces).find(
      (o) =>
        o.name !== i.name &&
        o.channelGroup?.id === group &&
        protocolOf(o.channelGroup.mode) !== protocolOf(mode),
    )
    if (clash)
      return `Port-channel${group} already uses ${protocolName(clash.channelGroup?.mode as ChannelMode)}; all its ports must use the same protocol.`
    i.channelGroup = { id: group, mode }
  })
  const state = r.state as DeviceState
  const po = `Port-channel${group}`
  const joined = ctx.selected.filter((n) => state.interfaces[n]?.channelGroup?.id === group)
  if (!state.interfaces[po] && joined.length) {
    const first = state.interfaces[joined[0] as string] as Interface
    const created = newInterface(po, 'port-channel')
    copyL2Settings(first, created)
    state.interfaces[po] = created
  }
  return r
}

function protocolOf(m: ChannelMode): 'lacp' | 'pagp' | 'on' {
  return m === 'active' || m === 'passive' ? 'lacp' : m === 'on' ? 'on' : 'pagp'
}
function protocolName(m: ChannelMode): string {
  return { lacp: 'LACP', pagp: 'PAgP', on: 'mode on (no protocol)' }[protocolOf(m)]
}

function allowedVlanCommands(): CommandDef[] {
  const base = [kw('switchport'), kw('trunk'), kw('allowed'), kw('vlan')]
  const set = (f: (cur: VlanSet, list: number[]) => VlanSet) => (ctx: RunContext, a: Args) =>
    eachSelected(
      ctx,
      l2Only((i) => {
        i.allowedVlans = f(i.allowedVlans, (a.vlans as number[] | undefined) ?? [])
      }),
    )
  return [
    {
      id: 'if.switchport.trunk-allowed',
      modes: IF_MODES,
      pattern: [...base, arg('vlan-list', 'vlans')],
      negatable: true,
      noPattern: base,
      help: 'Which VLANs the trunk carries',
      run: (ctx, a, negated) =>
        negated ? set(() => 'all')(ctx, a) : set((_c, l) => toVlanSet(l))(ctx, a),
    },
    {
      id: 'if.switchport.trunk-allowed-add',
      modes: IF_MODES,
      pattern: [...base, kw('add'), arg('vlan-list', 'vlans')],
      help: 'Add VLANs to the allowed list',
      run: set((c, l) => (c === 'all' ? 'all' : toVlanSet([...c, ...l]))),
    },
    {
      id: 'if.switchport.trunk-allowed-remove',
      modes: IF_MODES,
      pattern: [...base, kw('remove'), arg('vlan-list', 'vlans')],
      help: 'Remove VLANs from the allowed list',
      run: set((c, l) => toVlanSet(vlanList(c).filter((v) => !l.includes(v)))),
    },
    {
      id: 'if.switchport.trunk-allowed-all',
      modes: IF_MODES,
      pattern: [...base, kw('all')],
      help: 'Allow every VLAN',
      run: set(() => 'all'),
    },
    {
      id: 'if.switchport.trunk-allowed-none',
      modes: IF_MODES,
      pattern: [...base, kw('none')],
      help: 'Allow no VLANs',
      run: set(() => []),
    },
    {
      id: 'if.switchport.trunk-allowed-except',
      modes: IF_MODES,
      pattern: [...base, kw('except'), arg('vlan-list', 'vlans')],
      help: 'Allow every VLAN except these',
      run: set((_c, l) => toVlanSet(vlanList('all').filter((v) => !l.includes(v)))),
    },
  ]
}

function staticRouteCommands(): CommandDef[] {
  const v4 = (via: 'ipv4' | 'iface'): CommandDef => ({
    id: via === 'ipv4' ? 'config.ip-route' : 'config.ip-route-iface',
    modes: ['config'],
    pattern: [
      kw('ip'),
      kw('route'),
      arg('ipv4', 'network'),
      arg('ipv4', 'mask'),
      arg(via, 'via'),
      arg('number', 'distance', [1, 255], true),
    ],
    negatable: true,
    help: 'Add a static IPv4 route (optional distance makes it a floating route)',
    run: (ctx, a, negated) => {
      const mask = parseIPv4(a.mask as string) as number
      const prefix = maskToPrefix(mask)
      if (prefix === null) return { notes: [`${a.mask as string} is not a valid subnet mask.`] }
      const network = parseIPv4(a.network as string) as number
      // IOS refuses a destination with host bits set for its mask. No real sample of the
      // message yet, so a game note explains it.
      if (networkOf(network, prefix) !== network)
        return {
          notes: [
            `${a.network as string} isn't a network address for mask ${a.mask as string} (its host bits aren't zero). The network is ${formatIPv4(networkOf(network, prefix))}.`,
          ],
        }
      const route: StaticRoute = {
        family: 'ipv4',
        network,
        mask,
        distance: (a.distance as number | undefined) ?? 1,
        ...(via === 'ipv4'
          ? { nextHop: parseIPv4(a.via as string) as number }
          : { exitInterface: a.via as string }),
      }
      return changeRoutes(ctx, route, negated, (r) => r.network === network && r.mask === mask)
    },
  })
  const v6 = (via: 'ipv6' | 'iface'): CommandDef => ({
    id: via === 'ipv6' ? 'config.ipv6-route' : 'config.ipv6-route-iface',
    modes: ['config'],
    pattern: [
      kw('ipv6'),
      kw('route'),
      arg('ipv6-prefix', 'prefix'),
      arg(via, 'via'),
      arg('number', 'distance', [1, 254], true),
    ],
    negatable: true,
    help: 'Add a static IPv6 route',
    run: (ctx, a, negated) => {
      const [addr = '', len = '0'] = (a.prefix as string).split('/')
      const network6 = parseIPv6(addr) as number[]
      const route: StaticRoute = {
        family: 'ipv6',
        network6,
        prefixLength: Number(len),
        distance: (a.distance as number | undefined) ?? 1,
        ...(via === 'ipv6'
          ? { nextHop6: parseIPv6(a.via as string) as number[] }
          : { exitInterface: a.via as string }),
      }
      return changeRoutes(
        ctx,
        route,
        negated,
        (r) =>
          r.family === 'ipv6' &&
          r.prefixLength === route.prefixLength &&
          JSON.stringify(r.network6) === JSON.stringify(network6),
      )
    },
  })
  // "no ip route NET MASK" / "no ipv6 route PREFIX" remove every static route to that prefix.
  const removeAll = (family: 'ipv4' | 'ipv6'): CommandDef => ({
    id: family === 'ipv4' ? 'config.ip-route' : 'config.ipv6-route',
    modes: ['config'],
    pattern:
      family === 'ipv4'
        ? [kw('ip'), kw('route'), arg('ipv4', 'network'), arg('ipv4', 'mask')]
        : [kw('ipv6'), kw('route'), arg('ipv6-prefix', 'prefix')],
    negatable: true,
    negatedOnly: true,
    help: 'Remove every static route to this prefix',
    run: (ctx, a) => {
      const state = cloneState(ctx.state)
      if (family === 'ipv4') {
        const net = parseIPv4(a.network as string)
        const mask = parseIPv4(a.mask as string)
        state.staticRoutes = state.staticRoutes.filter(
          (r) => !(r.family === 'ipv4' && r.network === net && r.mask === mask),
        )
      } else {
        const [addr = '', len = '0'] = (a.prefix as string).split('/')
        const net = JSON.stringify(parseIPv6(addr))
        state.staticRoutes = state.staticRoutes.filter(
          (r) =>
            !(
              r.family === 'ipv6' &&
              JSON.stringify(r.network6) === net &&
              r.prefixLength === Number(len)
            ),
        )
      }
      return { state }
    },
  })
  return [v4('ipv4'), v4('iface'), v6('ipv6'), v6('iface'), removeAll('ipv4'), removeAll('ipv6')]
}

/** Add a route, or with "no" remove the matching one (same prefix and same next hop). */
function changeRoutes(
  ctx: RunContext,
  route: StaticRoute,
  negated: boolean,
  samePrefix: (r: StaticRoute) => boolean,
): RunResult {
  const state = cloneState(ctx.state)
  const sameVia = (r: StaticRoute) =>
    r.exitInterface === route.exitInterface &&
    r.nextHop === route.nextHop &&
    JSON.stringify(r.nextHop6) === JSON.stringify(route.nextHop6)
  const others = state.staticRoutes.filter((r) => !(samePrefix(r) && sameVia(r)))
  state.staticRoutes = negated ? others : [...others, route]
  return { state }
}

/**
 * `spanning-tree vlan X root primary|secondary` is a macro that sets a priority once, from the
 * current root's priority: primary sets 24576 if that makes this switch root, otherwise 4096 less
 * than the current root's priority; secondary sets 28672. Source: Cisco Catalyst 9300 "Configuring
 * Spanning Tree Protocol" (see reference/facts/cli-switch-facts.md).
 */
export function rootMacroPriority(
  ctx: Pick<RunContext, 'network' | 'state'>,
  vlan: number,
  role: 'primary' | 'secondary',
): number {
  if (role === 'secondary') return 28672
  const net = ctx.network
  if (!net || net.rootIsSelf.includes(vlan)) return 24576
  const rootPri = net.rootPriority[vlan] ?? 32768
  return rootPri > 24576 ? 24576 : Math.max(0, rootPri - 4096)
}

export { DEFAULT_STP_PRIORITY }
