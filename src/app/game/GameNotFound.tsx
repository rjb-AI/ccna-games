import { href } from '../router'

export function GameNotFound({ gameId }: { gameId: string }) {
  return (
    <main className="screen">
      <h1>Not found</h1>
      <p>There is no game called “{gameId}”.</p>
      <a className="btn" href={href({ name: 'hub' })}>
        Back to hub
      </a>
    </main>
  )
}
