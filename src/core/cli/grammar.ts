/**
 * Command grammar for the mini command line (plan section 5.5).
 *
 * A command is a list of tokens: keywords (which can be abbreviated to any unique prefix, as on
 * IOS) and typed arguments. Several commands can share a prefix ("switchport mode access",
 * "switchport mode trunk"); the parser follows them all at once.
 *
 * Levels allow a subset of commands by id. Parsing always runs against the whole catalogue, plus
 * lists of real IOS keywords we don't implement (`KNOWN_KEYWORDS`), so an abbreviation that is
 * ambiguous on a real switch stays ambiguous here even if a level only allows one of the words.
 */
import type { DeviceState } from '../device/state'

export type Mode =
  | 'user'
  | 'exec'
  | 'config'
  | 'config-if'
  | 'config-if-range'
  | 'config-vlan'
  | 'config-line'
  | 'config-router'

export type ArgType =
  | 'number'
  | 'vlan-list'
  | 'iface'
  | 'iface-range'
  | 'ipv4'
  | 'ipv6'
  | 'ipv6-prefix'
  | 'word'
  | 'text'

export type Token =
  | { kw: string; opt?: true }
  | { arg: ArgType; name: string; min?: number; max?: number; opt?: true }

/** Parsed argument values by name. */
export type Args = Record<string, string | number | number[] | string[]>

export interface RunContext {
  state: DeviceState
  mode: Mode
  /** Interfaces selected by `interface` / `interface range` (config-if modes). */
  selected: string[]
  /** VLANs selected by `vlan` (config-vlan mode). */
  vlansSelected: number[]
  /**
   * What the rest of the network looks like, for commands whose effect depends on it
   * (`spanning-tree vlan X root primary` reads the current root's priority).
   */
  network?: NetworkContext
}

/** Plain data, so a question that carries it can be stored and rebuilt. */
export interface NetworkContext {
  /** Priority (without system ID extension) of the current root bridge, per VLAN. */
  rootPriority: Record<number, number>
  /** VLANs where this device is currently the root. */
  rootIsSelf: number[]
}

export interface RunResult {
  state?: DeviceState
  mode?: Mode
  selected?: string[]
  vlansSelected?: number[]
  /** Text the device prints (must follow reference/outputs samples). */
  output?: string[]
  /** Game messages, shown styled apart from device output (never imitation IOS text). */
  notes?: string[]
}

export interface CommandDef {
  /** Stable id used in level allow-lists, e.g. "if.switchport.access-vlan". */
  id: string
  modes: readonly Mode[]
  pattern: readonly Token[]
  /** Accepts a leading "no". `noPattern` (if given) is the pattern after "no". */
  negatable?: boolean
  noPattern?: readonly Token[]
  /** Only valid after "no" (e.g. "no ip route NET MASK" removes every route to the prefix). */
  negatedOnly?: boolean
  /** Only on these device kinds (e.g. "no switchport" needs a multilayer switch). */
  kinds?: readonly DeviceState['kind'][]
  /** One-line help for the "?" panel and chips. */
  help: string
  run(ctx: RunContext, args: Args, negated: boolean): RunResult
}

export const kw = (word: string, opt?: true): Token => (opt ? { kw: word, opt } : { kw: word })
export const arg = (type: ArgType, name: string, range?: [number, number], opt?: true): Token => ({
  arg: type,
  name,
  ...(range ? { min: range[0], max: range[1] } : {}),
  ...(opt ? { opt } : {}),
})

/**
 * Real IOS keywords at the start of a command in each mode, beyond the ones our catalogue
 * implements. Used only to judge abbreviations; typing one of these gives "not available in
 * this level". Command names from Cisco IOS XE command references (Catalyst 9300, 17.x).
 */
export const KNOWN_KEYWORDS: Partial<Record<Mode, readonly string[]>> = {
  user: [
    'connect',
    'disable',
    'enable',
    'exit',
    'logout',
    'ping',
    'show',
    'ssh',
    'telnet',
    'terminal',
    'traceroute',
  ],
  exec: [
    'clear',
    'clock',
    'configure',
    'copy',
    'debug',
    'delete',
    'dir',
    'disable',
    'enable',
    'erase',
    'exit',
    'logout',
    'more',
    'ping',
    'reload',
    'show',
    'ssh',
    'telnet',
    'terminal',
    'traceroute',
    'undebug',
    'write',
  ],
  config: [
    'aaa',
    'access-list',
    'alias',
    'archive',
    'banner',
    'boot',
    'cdp',
    'class-map',
    'clock',
    'crypto',
    'default',
    'do',
    'enable',
    'end',
    'errdisable',
    'exit',
    'hostname',
    'interface',
    'ip',
    'ipv6',
    'line',
    'lldp',
    'logging',
    'mac',
    'monitor',
    'no',
    'ntp',
    'policy-map',
    'port-channel',
    'power',
    'privilege',
    'router',
    'service',
    'snmp-server',
    'spanning-tree',
    'username',
    'vlan',
    'vtp',
  ],
  'config-if': [
    'arp',
    'bandwidth',
    'carrier-delay',
    'cdp',
    'channel-group',
    'channel-protocol',
    'default',
    'delay',
    'description',
    'do',
    'duplex',
    'end',
    'exit',
    'ip',
    'ipv6',
    'keepalive',
    'lldp',
    'load-interval',
    'mac',
    'mtu',
    'no',
    'power',
    'service-policy',
    'shutdown',
    'spanning-tree',
    'speed',
    'storm-control',
    'switchport',
  ],
  'config-vlan': ['do', 'end', 'exit', 'name', 'no', 'remote-span', 'shutdown', 'state'],
}
KNOWN_KEYWORDS['config-if-range'] = KNOWN_KEYWORDS['config-if']

/** Real second words after some first words (same purpose as KNOWN_KEYWORDS). */
export const KNOWN_SUBKEYWORDS: Record<string, readonly string[]> = {
  show: [
    'aaa',
    'access-lists',
    'arp',
    'cdp',
    'clock',
    'controllers',
    'environment',
    'errdisable',
    'etherchannel',
    'flash:',
    'history',
    'hosts',
    'interfaces',
    'inventory',
    'ip',
    'ipv6',
    'lldp',
    'logging',
    'mac',
    'monitor',
    'ntp',
    'port-security',
    'power',
    'privilege',
    'processes',
    'protocols',
    'running-config',
    'sessions',
    'snmp',
    'spanning-tree',
    'standby',
    'startup-config',
    'users',
    'version',
    'vlan',
    'vrrp',
  ],
  configure: ['confirm', 'memory', 'network', 'overwrite-network', 'replace', 'revert', 'terminal'],
  switchport: [
    'access',
    'autostate',
    'block',
    'host',
    'mode',
    'nonegotiate',
    'port-security',
    'priority',
    'protected',
    'trunk',
    'voice',
  ],
  'spanning-tree': [
    'backbonefast',
    'bpdufilter',
    'bpduguard',
    'cost',
    'etherchannel',
    'extend',
    'guard',
    'link-type',
    'logging',
    'loopguard',
    'mode',
    'mst',
    'pathcost',
    'port-priority',
    'portfast',
    'uplinkfast',
    'vlan',
  ],
  ip: [
    'access-group',
    'access-list',
    'address',
    'arp',
    'dhcp',
    'domain',
    'helper-address',
    'http',
    'name-server',
    'nat',
    'ospf',
    'route',
    'routing',
    'ssh',
  ],
  ipv6: ['address', 'enable', 'nd', 'ospf', 'route', 'unicast-routing'],
}
