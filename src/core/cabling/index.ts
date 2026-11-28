/**
 * Twisted-pair cabling facts. Source: ANSI/TIA-568 (T568A and T568B pin assignments for 8-pin
 * modular plugs); the two standards swap the orange and green pairs.
 */

export type WireColour =
  | 'White/green'
  | 'Green'
  | 'White/orange'
  | 'Blue'
  | 'White/blue'
  | 'Orange'
  | 'White/brown'
  | 'Brown'

/** Pin 1 to pin 8. */
export const T568A: readonly WireColour[] = [
  'White/green',
  'Green',
  'White/orange',
  'Blue',
  'White/blue',
  'Orange',
  'White/brown',
  'Brown',
]

export const T568B: readonly WireColour[] = [
  'White/orange',
  'Orange',
  'White/green',
  'Blue',
  'White/blue',
  'Green',
  'White/brown',
  'Brown',
]

/** How each wire looks: its pair colour, and whether it is the white striped one. */
export const WIRE: Record<
  WireColour,
  { pair: 'green' | 'orange' | 'blue' | 'brown'; striped: boolean; short: string }
> = {
  'White/green': { pair: 'green', striped: true, short: 'W-G' },
  Green: { pair: 'green', striped: false, short: 'G' },
  'White/orange': { pair: 'orange', striped: true, short: 'W-O' },
  Orange: { pair: 'orange', striped: false, short: 'O' },
  'White/blue': { pair: 'blue', striped: true, short: 'W-Bl' },
  Blue: { pair: 'blue', striped: false, short: 'Bl' },
  'White/brown': { pair: 'brown', striped: true, short: 'W-Br' },
  Brown: { pair: 'brown', striped: false, short: 'Br' },
}

export function isWireColour(s: string): s is WireColour {
  return s in WIRE
}
