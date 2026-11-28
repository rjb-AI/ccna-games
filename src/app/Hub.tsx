import { MODE_LABELS } from '../core/game'
import { DOMAINS } from './domains'
import type { RegisteredGame } from './frame/types'
import { shortLevelTitle, summarizeGame, useProgressMap } from './gameProgress'
import { GAMES } from './registry'
import { useDueCounts } from './review/queue'
import { href } from './router'
import { useSettings } from './settingsStore'
import type { LevelProgress } from './storage/db'
import './frame/frame.css'
import './hub.css'

/** Progress bar plus its text. The bar is decoration; the text carries the meaning. */
export function LevelsPassed({ passed, total }: { passed: number; total: number }) {
  return (
    <div className="hub-passed">
      <span className="hub-bar" aria-hidden="true">
        <span style={{ width: `${(100 * passed) / total}%` }} />
      </span>
      <span>
        {passed} of {total} levels passed
      </span>
    </div>
  )
}

export function StarTotal({ stars, max }: { stars: number; max: number }) {
  return (
    <span className="hub-star-total" role="img" aria-label={`${stars} of ${max} stars`}>
      ★ {stars}/{max}
    </span>
  )
}

function GameCard({
  game,
  progress,
  due,
}: {
  game: RegisteredGame
  progress: ReadonlyMap<string, LevelProgress>
  due: number
}) {
  const s = summarizeGame(game.id, game.levels, progress)
  const titleId = `card-${game.id}`
  return (
    <article className="hub-card" aria-labelledby={titleId}>
      <div className="hub-card-head">
        <h3 id={titleId}>{game.title}</h3>
        <StarTotal stars={s.stars} max={s.maxStars} />
      </div>
      <p className="hub-tagline">{game.tagline}</p>
      <LevelsPassed passed={s.passed} total={s.total} />
      <p className="hub-next">
        Next: {MODE_LABELS[s.next.mode]} · {shortLevelTitle(s.next)}
        {due > 0 && <span className="hub-due"> · {due} to review</span>}
      </p>
      <div className="hub-card-actions">
        <a
          className="btn hub-play"
          href={href({ name: 'play', gameId: game.id, levelId: s.next.id })}
        >
          ▶ {s.action}
        </a>
        <a className="btn btn-secondary" href={href({ name: 'game', gameId: game.id })}>
          Levels
        </a>
        <a
          className="btn btn-secondary hub-options"
          href={href({ name: 'gameOptions', gameId: game.id })}
          aria-label={`${game.title} options`}
        >
          <span aria-hidden="true">⚙</span>
        </a>
      </div>
    </article>
  )
}

export function Hub() {
  const progress = useProgressMap()
  const due = useDueCounts()
  const hidden = useSettings((s) => s.hiddenDomains)
  const update = useSettings((s) => s.update)
  const shown = DOMAINS.filter((d) => !hidden.includes(d.id))

  const toggle = (id: string) =>
    void update({
      hiddenDomains: hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id],
    })

  return (
    <main className="hub">
      <header>
        <h1>CCNA Games</h1>
        <p>Practice games for the CCNA 200-301 v2.0 exam.</p>
      </header>

      <div className="hub-actions">
        <a className="btn" href={href({ name: 'review' })}>
          Reviews: {due.total} due
        </a>
        <a className="btn btn-secondary" href={href({ name: 'settings' })}>
          Settings
        </a>
      </div>

      <div className="hub-chips" role="group" aria-label="Show domains">
        {DOMAINS.map((d) => (
          <button
            key={d.id}
            type="button"
            className="hub-chip"
            aria-pressed={!hidden.includes(d.id)}
            onClick={() => toggle(d.id)}
          >
            {d.number}. {d.short}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="hub-empty">All domains are hidden. Tap a domain above to show its games.</p>
      )}

      {shown.map((d) => {
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
              games.map((g) => (
                <GameCard key={g.id} game={g} progress={progress} due={due.byGame.get(g.id) ?? 0} />
              ))
            )}
          </section>
        )
      })}
    </main>
  )
}
