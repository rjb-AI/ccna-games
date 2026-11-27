import type { RegisteredGame } from './frame/types'
import { demoGame } from '../games/00-demo'

/** Every playable game. Add new games here. */
export const GAMES: readonly RegisteredGame[] = [demoGame]

export function findGame(id: string): RegisteredGame | undefined {
  return GAMES.find((g) => g.id === id)
}
