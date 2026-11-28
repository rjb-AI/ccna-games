import { MODE_LABELS } from '../../core/game'
import { Stars } from '../frame/Stars'
import { shortLevelTitle, summarizeGame, useProgressMap } from '../gameProgress'
import { LevelsPassed, StarTotal } from '../Hub'
import { findGame } from '../registry'
import { useDueCount } from '../review/queue'
import { href } from '../router'
import { progressKey } from '../storage/db'
import { GameNotFound } from './GameNotFound'
import '../frame/frame.css'
import '../hub.css'

/** One game's own screen: the main button, its reviews, and every level. */
export function GameScreen({ gameId }: { gameId: string }) {
  const game = findGame(gameId)
  const progress = useProgressMap()
  const due = useDueCount(gameId)
  if (!game) return <GameNotFound gameId={gameId} />
  const s = summarizeGame(game.id, game.levels, progress)

  return (
    <main className="screen">
      <div className="play-top">
        <a className="btn btn-secondary" href={href({ name: 'hub' })}>
          Back to hub
        </a>
        <a
          className="btn btn-secondary hub-options"
          href={href({ name: 'gameOptions', gameId: game.id })}
          aria-label={`${game.title} options`}
        >
          <span aria-hidden="true">⚙</span>
        </a>
      </div>
      <h1>{game.title}</h1>
      <p className="hub-tagline">{game.tagline}</p>
      <p>
        <StarTotal stars={s.stars} max={s.maxStars} />
      </p>
      <LevelsPassed passed={s.passed} total={s.total} />

      <div className="hub-card-actions game-actions">
        <a
          className="btn hub-play"
          href={href({ name: 'play', gameId: game.id, levelId: s.next.id })}
        >
          ▶ {s.action}: {shortLevelTitle(s.next)}
        </a>
        {due > 0 ? (
          <a className="btn btn-secondary" href={href({ name: 'review', gameId: game.id })}>
            Review this game: {due} due
          </a>
        ) : (
          <p className="game-no-reviews">No reviews due for this game.</p>
        )}
      </div>

      <h2>Levels</h2>
      <ol className="hub-levels">
        {game.levels.map((l) => {
          const p = progress.get(progressKey(game.id, l.id))
          const isNext = l.id === s.next.id
          return (
            <li key={l.id}>
              <a
                className={`hub-level${isNext ? ' hub-level-next' : ''}`}
                href={href({ name: 'play', gameId: game.id, levelId: l.id })}
              >
                <span>
                  <strong>{MODE_LABELS[l.mode]}</strong>: {shortLevelTitle(l)}
                  {isNext && <span className="hub-next-tag"> · next</span>}
                </span>
                <Stars count={p?.stars ?? 0} />
              </a>
            </li>
          )
        })}
      </ol>
    </main>
  )
}
