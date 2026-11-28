import type { RegisteredGame } from './frame/types'
import { subnetSprint } from '../games/01-subnet-sprint'
import { hexGarden } from '../games/02-hex-garden'
import { frameRun } from '../games/04-frame-run'
import { rootWars } from '../games/05-root-wars'
import { adjacencyQuest } from '../games/09-adjacency-quest'
import { packetPassport } from '../games/12-packet-passport'
import { aclBouncer } from '../games/13-acl-bouncer'
import { portDefender } from '../games/14-port-defender'
import { locksmith } from '../games/15-locksmith'

/** Every playable game. Add new games here. */
export const GAMES: readonly RegisteredGame[] = [
  subnetSprint,
  hexGarden,
  frameRun,
  rootWars,
  adjacencyQuest,
  packetPassport,
  aclBouncer,
  portDefender,
  locksmith,
]

export function findGame(id: string): RegisteredGame | undefined {
  return GAMES.find((g) => g.id === id)
}
