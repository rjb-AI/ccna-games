import { useLiveQuery } from 'dexie-react-hooks'
import { MODE_LABELS } from '../core/game'
import { DOMAINS } from './domains'
import type { RegisteredGame } from './frame/types'
import { Stars } from './frame/Stars'
import { GAMES } from './registry'
import { href } from './router'
import { type LevelProgress, db, progressKey } from './storage/db'
import './frame/frame.css'
import './hub.css'

function GameCard({
  game,
  progress,
}: {
  game: RegisteredGame
  progress: Map<string, LevelProgress>
}) {
  return (
    <div className="hub-game">
      <h3>{game.title}</h3>
      <ul className="hub-levels">
        {game.levels.map((l) => {
          const p = progress.get(progressKey(game.id, l.id))
          return (
            <li key={l.id}>
              <a
                className="hub-level"
                href={href({ name: 'play', gameId: game.id, levelId: l.id })}
              >
                <span>
                  <strong>{MODE_LABELS[l.mode]}</strong>: {l.title.replace(/^[^:]+:\s*/, '')}
                </span>
                <Stars count={p?.stars ?? 0} />
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Hub() {
  const progress = useLiveQuery(
    async () => new Map((await db.progress.toArray()).map((p) => [p.key, p])),
    [],
    new Map<string, LevelProgress>(),
  )
  const due = useLiveQuery(() => db.cards.where('due').belowOrEqual(Date.now()).count(), [], 0)
  const demo = GAMES.filter((g) => g.domainId === null)

  return (
    <main className="hub">
      <header>
        <h1>CCNA Games</h1>
        <p>Practice games for the CCNA 200-301 v2.0 exam.</p>
      </header>

      <div className="hub-actions">
        <a className="btn" href={href({ name: 'review' })}>
          Reviews: {due} due
        </a>
        <a className="btn btn-secondary" href={href({ name: 'settings' })}>
          Settings
        </a>
      </div>

      <nav aria-label="Jump to domain" className="hub-jump">
        <ul>
          {DOMAINS.map((d) => (
            <li key={d.id}>
              <a href={`#${d.id}`}>
                {d.number}. {d.name} ({d.weight}%)
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {DOMAINS.map((d) => {
        const games = GAMES.filter((g) => g.domainId === d.id)
        return (
          <section key={d.id} id={d.id} className="hub-domain" aria-labelledby={`${d.id}-title`}>
            <h2 id={`${d.id}-title`}>
              {d.number}. {d.name}
            </h2>
            <p className="hub-weight">Exam weight: {d.weight}%</p>
            {games.length === 0 ? (
              <p>No games yet.</p>
            ) : (
              games.map((g) => <GameCard key={g.id} game={g} progress={progress} />)
            )}
          </section>
        )
      })}

      {demo.length > 0 && (
        <section className="hub-domain" aria-labelledby="demo-title">
          <h2 id="demo-title">Frame demo (temporary)</h2>
          <p className="hub-weight">Not exam content. Proves scoring, saving and reviews work.</p>
          {demo.map((g) => (
            <GameCard key={g.id} game={g} progress={progress} />
          ))}
        </section>
      )}
    </main>
  )
}
