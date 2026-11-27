import { useEffect } from 'react'
import { Hub } from './Hub'
import { PlayScreen } from './frame/PlayScreen'
import { ReviewScreen } from './review/ReviewScreen'
import { parseHash, useHash } from './router'
import { SettingsScreen } from './settings/SettingsScreen'
import { useSettings } from './settingsStore'

export function App() {
  const route = parseHash(useHash())
  const loaded = useSettings((s) => s.loaded)

  useEffect(() => {
    void useSettings.getState().load()
  }, [])

  // New screen: start at the top (jump links inside the hub still scroll normally).
  useEffect(() => {
    if (route.name !== 'hub') window.scrollTo(0, 0)
  }, [route.name])

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
    case 'review':
      return <ReviewScreen />
    case 'settings':
      return <SettingsScreen />
    case 'hub':
      return <Hub />
  }
}
