/**
 * The five CCNA 200-301 v2.0 blueprint domains and their exam weights.
 * Source: docs/ccna-minigames-plan.md section 1 (v2.0 blueprint, first test date 3 Feb 2027).
 */
export interface Domain {
  id: string
  number: number
  name: string
  /** Chip label in the hub filter. */
  short: string
  weight: number
}

export const DOMAINS: readonly Domain[] = [
  {
    id: 'domain-1',
    number: 1,
    name: 'Network Infrastructure & Connectivity',
    short: 'Infrastructure',
    weight: 25,
  },
  { id: 'domain-2', number: 2, name: 'Switching & Network Access', short: 'Switching', weight: 25 },
  { id: 'domain-3', number: 3, name: 'IP Routing', short: 'Routing', weight: 20 },
  {
    id: 'domain-4',
    number: 4,
    name: 'Network Services & Security',
    short: 'Services & Security',
    weight: 20,
  },
  {
    id: 'domain-5',
    number: 5,
    name: 'AI and Network Operations & Management',
    short: 'Operations & AI',
    weight: 10,
  },
]
