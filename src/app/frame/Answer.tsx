/**
 * Shows a given or expected answer (`Check.given` / `Check.expected`) exactly as written: mono
 * font, line breaks and indentation kept, so command lines, configs and YAML read correctly.
 * Every screen that shows answers (play feedback, review feedback, results) uses this.
 */
export function Answer({ text }: { text: string }) {
  const multiLine = text.includes('\n')
  return <code className={`answer-text${multiLine ? ' is-block' : ''}`}>{text}</code>
}
