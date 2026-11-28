/**
 * A command-line session: the device state, the current mode, and what each typed line printed.
 * Pure functions, so a whole level can be replayed from the typed lines (that is how answers are
 * checked and how review cards rebuild).
 *
 * Prompts and error lines follow reference/outputs/cli-prompts-and-errors.md and
 * reference/outputs/cli-config-mode-prompts.md.
 */
import type { DeviceState } from '../device/state'
import { COMMANDS } from './commands'
import type { CommandDef, Mode, NetworkContext, RunContext, RunResult } from './grammar'
import { parseLine } from './parser'

export interface CliLevel {
  /** Command ids this level accepts. Real commands outside it say "not available". */
  allowed: ReadonlySet<string>
  network?: NetworkContext
}

export interface Session {
  state: DeviceState
  mode: Mode
  selected: string[]
  vlansSelected: number[]
}

export interface Entry {
  prompt: string
  input: string
  /** What the device printed (follows real samples). */
  output: string[]
  /** Game messages (not device output). */
  notes: string[]
}

const SUFFIX: Record<Mode, string> = {
  user: '>',
  exec: '#',
  config: '(config)#',
  'config-if': '(config-if)#',
  'config-if-range': '(config-if-range)#',
  'config-vlan': '(config-vlan)#',
  'config-line': '(config-line)#',
  'config-router': '(config-router)#',
}

export function promptOf(s: Pick<Session, 'state' | 'mode'>): string {
  return `${s.state.hostname}${SUFFIX[s.mode]}`
}

export function startSession(state: DeviceState, mode: Mode = 'exec'): Session {
  return { state, mode, selected: [], vlansSelected: [] }
}

export const NOT_IN_LEVEL = 'That command is real, but this level doesn’t use it.'

function errorLines(
  r: Exclude<ReturnType<typeof parseLine>, { ok: true }>,
  prompt: string,
  input: string,
): { output: string[]; notes: string[] } {
  switch (r.error) {
    case 'invalid':
      return {
        output: [
          `${' '.repeat(prompt.length + r.column)}^`,
          "% Invalid input detected at '^' marker.",
        ],
        notes: [],
      }
    case 'incomplete':
      return { output: ['% Incomplete command.'], notes: [] }
    case 'ambiguous':
      return { output: [`% Ambiguous command: "${input.trim()}"`], notes: [] }
    case 'unsupported':
      return { output: [], notes: [NOT_IN_LEVEL] }
  }
}

function apply(s: Session, r: RunResult): Session {
  return {
    state: r.state ?? s.state,
    mode: r.mode ?? s.mode,
    selected: r.selected ?? s.selected,
    vlansSelected: r.vlansSelected ?? s.vlansSelected,
  }
}

/** Run one parsed line in a mode. Returns null if the line doesn't parse in that mode. */
function tryMode(
  s: Session,
  mode: Mode,
  input: string,
  level: CliLevel,
  catalogue: readonly CommandDef[],
): {
  result: ReturnType<typeof parseLine>
  run?: () => { session: Session; entry: Partial<Entry> }
} {
  const result = parseLine(input, mode, catalogue, s.state.kind)
  if (!result.ok) return { result }
  return {
    result,
    run: () => {
      if (!level.allowed.has(result.def.id)) {
        return { session: s, entry: { output: [], notes: [NOT_IN_LEVEL] } }
      }
      if (result.def.id === 'config.do') {
        const inner = execute({ ...s, mode: 'exec' }, result.args.line as string, level, catalogue)
        return {
          session: {
            ...inner.session,
            mode: s.mode,
            selected: s.selected,
            vlansSelected: s.vlansSelected,
          },
          entry: { output: inner.entry.output, notes: inner.entry.notes },
        }
      }
      const ctx: RunContext = {
        state: s.state,
        mode,
        selected: s.selected,
        vlansSelected: s.vlansSelected,
        ...(level.network ? { network: level.network } : {}),
      }
      const r = result.def.run(ctx, result.args, result.negated)
      // A global command typed in a sub-mode drops back to global config first, as on IOS.
      const base = mode !== s.mode ? { ...s, mode, selected: [], vlansSelected: [] } : s
      return { session: apply(base, r), entry: { output: r.output ?? [], notes: r.notes ?? [] } }
    },
  }
}

const SUBMODES: readonly Mode[] = [
  'config-if',
  'config-if-range',
  'config-vlan',
  'config-line',
  'config-router',
]

/** Run one typed line. */
export function execute(
  s: Session,
  input: string,
  level: CliLevel,
  catalogue: readonly CommandDef[] = COMMANDS,
): { session: Session; entry: Entry } {
  const prompt = promptOf(s)
  const base: Entry = { prompt, input, output: [], notes: [] }
  if (input.trim() === '') return { session: s, entry: base }

  const here = tryMode(s, s.mode, input, level, catalogue)
  let chosen = here
  if (!here.run && SUBMODES.includes(s.mode)) {
    const global = tryMode(s, 'config', input, level, catalogue)
    if (global.run) chosen = global
  }
  if (!chosen.run) {
    const err = errorLines(
      here.result as Exclude<ReturnType<typeof parseLine>, { ok: true }>,
      prompt,
      input,
    )
    return { session: s, entry: { ...base, ...err } }
  }
  const { session, entry } = chosen.run()
  return { session, entry: { ...base, output: entry.output ?? [], notes: entry.notes ?? [] } }
}

/** Replay typed lines from a start state. Used to check answers and rebuild sessions. */
export function replay(
  start: Session,
  lines: readonly string[],
  level: CliLevel,
): { session: Session; transcript: Entry[] } {
  let session = start
  const transcript: Entry[] = []
  for (const line of lines) {
    const r = execute(session, line, level)
    session = r.session
    transcript.push(r.entry)
  }
  return { session, transcript }
}
