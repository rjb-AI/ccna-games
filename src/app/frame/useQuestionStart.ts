/**
 * What happens every time a new question appears, for play and review alike:
 *  - the page scrolls back to the top, so the new prompt is in view;
 *  - for a moment after "Next", taps on the question are ignored (pointer events only, so the
 *    keyboard still works), so a quick double tap on "Next" can't answer the question that
 *    appears under the finger. The first question of a screen has no pause.
 */
import { useEffect, useRef, useState } from 'react'

/** How long taps are ignored after moving to the next question. */
export const TAP_GUARD_MS = 350

/** Pass a key that changes with each question. Returns true while taps should be ignored. */
export function useQuestionStart(key: string | number): boolean {
  const first = useRef(true)
  const [settling, setSettling] = useState(false)
  useEffect(() => {
    window.scrollTo(0, 0)
    if (first.current) {
      first.current = false
      return
    }
    setSettling(true)
    const t = window.setTimeout(() => setSettling(false), TAP_GUARD_MS)
    return () => window.clearTimeout(t)
  }, [key])
  return settling
}
