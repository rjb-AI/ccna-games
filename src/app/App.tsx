import { useEffect } from 'react'
import { Hub } from './Hub'
import { PlayScreen } from './frame/PlayScreen'
import { GameOptionsScreen } from './game/GameOptionsScreen'
import { GameScreen } from './game/GameScreen'
import { ReviewScreen } from './review/ReviewScreen'
import { href, parseHash, useHash } from './router'
import { SettingsScreen } from './settings/SettingsScreen'
import { useSettings } from './settingsStore'

/** Hub scroll position, kept while you are on other screens. */
let hubScrollY = 0

export function App() {
  const route = parseHash(useHash())
  const loaded = useSettings((s) => s.loaded)

  useEffect(() => {
    void useSettings.getState().load()
  }, [])

  // New screen: start at the top. Back on the hub: return to where you were on it.
  const routeKey = href(route)
  useEffect(() => {
    if (route.name !== 'hub') {
      window.scrollTo(0, 0)
      return
    }
    window.scrollTo(0, hubScrollY)
    const onScroll = () => {
      hubScrollY = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
    // routeKey changes exactly when the screen changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey])

  if (!loaded) return null

  switch (route.name) {
    case 'play':
      return (
        <PlayScreen
          key={`${route.gameId}/${route.levelId}/${route.seed ?? ''}`}
          gameId={route.gameId}
          levelId={route.levelId}
          seed={route.seed}
        />
      )
    case 'game':
      return <GameScreen key={route.gameId} gameId={route.gameId} />
    case 'gameOptions':
      return <GameOptionsScreen key={route.gameId} gameId={route.gameId} />
    case 'review':
      return <ReviewScreen key={route.gameId ?? ''} gameId={route.gameId} />
    case 'settings':
      return <SettingsScreen />
    case 'hub':
      return <Hub />
  }
}
