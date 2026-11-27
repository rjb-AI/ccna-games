import { DOMAINS } from './domains'
import './hub.css'

export function Hub() {
  return (
    <main className="hub">
      <header>
        <h1>CCNA Games</h1>
        <p>Practice games for the CCNA 200-301 v2.0 exam.</p>
      </header>

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

      {DOMAINS.map((d) => (
        <section key={d.id} id={d.id} className="hub-domain" aria-labelledby={`${d.id}-title`}>
          <h2 id={`${d.id}-title`}>
            {d.number}. {d.name}
          </h2>
          <p className="hub-weight">Exam weight: {d.weight}%</p>
          <p>No games yet.</p>
        </section>
      ))}
    </main>
  )
}
