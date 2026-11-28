import type { RegisteredGame } from './frame/types'
import { subnetSprint } from '../games/01-subnet-sprint'
import { hexGarden } from '../games/02-hex-garden'
import { frameRun } from '../games/04-frame-run'
import { rootWars } from '../games/05-root-wars'

/** Every playable game. Add new games here. */
export const GAMES: readonly RegisteredGame[] = [subnetSprint, hexGarden, frameRun, rootWars]

export function findGame(id: string): RegisteredGame | undefined {
  return GAMES.find((g) => g.id === id)
}
