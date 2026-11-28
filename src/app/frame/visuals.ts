/**
 * Pictures and tables that any question can show above its answers.
 * Plain data, so questions stay serialisable and testable.
 */
import type { Endpoint, Topology } from '../../core/topology'

export interface TopologyVisual {
  kind: 'topology'
  /** Short description, also used as the accessible name. */
  caption: string
  topology: Topology
  /** Text under a device's name, for example "pri 32769". */
  deviceNotes?: Readonly<Record<string, string>>
  /** Text at the middle of a link, for example "1G". */
  linkLabels?: Readonly<Record<string, string>>
  /** Show port names at link ends. */
  showPorts?: boolean
  /**
   * Devices whose port names are always written. When all port names don't fit a phone, the
   * other ports become dots you tap to read (layout.ts decides).
   */
  focusPorts?: readonly string[]
  highlightDevices?: readonly string[]
  highlightPorts?: readonly Endpoint[]
  /** Ports drawn as blocked (STP alternate). */
  blockedPorts?: readonly Endpoint[]
  /** Links drawn as failed. */
  downLinks?: readonly string[]
}

export interface TableVisual {
  kind: 'table'
  caption: string
  columns: readonly string[]
  rows: readonly (readonly string[])[]
  /** Row index to highlight (for example the entry just learned). */
  highlightRow?: number
  /** Shown when there are no rows. */
  empty?: string
}

export interface CodeVisual {
  kind: 'code'
  caption: string
  /** Configuration lines (input syntax), numbered on screen. */
  lines: readonly string[]
  highlightLine?: number
}

export type Visual = TopologyVisual | TableVisual | CodeVisual
