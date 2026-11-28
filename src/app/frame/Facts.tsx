import type { Fact } from './fields'

/** The given information for a question, shown as a label/value list. */
export function Facts({ facts }: { facts: readonly Fact[] }) {
  if (facts.length === 0) return null
  return (
    <dl className="facts">
      {facts.map((f) => (
        <div key={f.label}>
          <dt>{f.label}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}
