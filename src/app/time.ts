import { useEffect, useState } from 'react'

/** Current time that re-renders every `ms`, so "due" counts update while a screen stays open. */
export function useNow(ms = 15_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

/** "in less than a minute", "in 10 minutes", "in 3 hours", "in 2 days". */
export function formatDueIn(due: number, now: number): string {
  const min = Math.ceil((due - now) / 60_000)
  if (min <= 1) return 'in less than a minute'
  if (min < 60) return `in ${min} minutes`
  const hours = Math.round(min / 60)
  if (hours < 24) return hours === 1 ? 'in about an hour' : `in about ${hours} hours`
  const days = Math.round(hours / 24)
  return days === 1 ? 'tomorrow' : `in ${days} days`
}
