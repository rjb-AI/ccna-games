import type { RegisteredGame } from './frame/types'
import { subnetSprint } from '../games/01-subnet-sprint'
import { hexGarden } from '../games/02-hex-garden'
import { cableDoctor } from '../games/03-cable-doctor'
import { frameRun } from '../games/04-frame-run'
import { rootWars } from '../games/05-root-wars'
import { neighborDetective } from '../games/07-neighbor-detective'
import { longestMatch } from '../games/08-longest-match'
import { adjacencyQuest } from '../games/09-adjacency-quest'
import { gatewayGuardians } from '../games/10-gateway-guardians'
import { helpDeskHotline } from '../games/11-help-desk-hotline'
import { packetPassport } from '../games/12-packet-passport'
import { aclBouncer } from '../games/13-acl-bouncer'
import { portDefender } from '../games/14-port-defender'
import { locksmith } from '../games/15-locksmith'
import { airwaves } from '../games/16-airwaves'
import { nocNightShift } from '../games/17-noc-night-shift'
import { playbookRunner } from '../games/18-playbook-runner'
import { blueprintBuilder } from '../games/19-blueprint-builder'

/** Every playable game. Add new games here. */
export const GAMES: readonly RegisteredGame[] = [
  subnetSprint,
  hexGarden,
  cableDoctor,
  frameRun,
  rootWars,
  neighborDetective,
  longestMatch,
  adjacencyQuest,
  gatewayGuardians,
  helpDeskHotline,
  packetPassport,
  aclBouncer,
  portDefender,
  locksmith,
  airwaves,
  nocNightShift,
  playbookRunner,
  blueprintBuilder,
]

export function findGame(id: string): RegisteredGame | undefined {
  return GAMES.find((g) => g.id === id)
}
