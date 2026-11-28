/**
 * The mini command line on screen (plan section 5.5). Typing works, and the phone helper row
 * offers the next words as chips, a Tab key, history arrows and a "?" list of what this level
 * accepts next. Everything the device prints comes from core/cli; game notes are styled apart.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { COMMANDS } from '../../core/cli/commands'
import { nextWords } from '../../core/cli/parser'
import { promptOf } from '../../core/cli/session'
import { describeRequirement } from '../../core/device/checks'
import { type CliQuestion, type CliResponse, runCli } from './cli'
import type { QuestionViewProps } from './types'
import { Visuals } from './VisualsView'

const MAX_CHIPS = 12

export function CliView(props: QuestionViewProps<CliQuestion, CliResponse>) {
  const { question: q, response, onAnswer, hintsAllowed } = props
  const answered = response !== null
  const [lines, setLines] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [histIdx, setHistIdx] = useState<number | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const termRef = useRef<HTMLDivElement>(null)

  const shown = answered ? response.lines : lines
  const run = useMemo(() => runCli(q, shown), [q, shown])
  const allowed = useMemo(() => new Set(q.allowed), [q.allowed])
  const prompt = promptOf(run.session)
  const suggestions = useMemo(
    () => nextWords(input, run.session.mode, COMMANDS, run.session.state.kind, allowed),
    [input, run.session, allowed],
  )

  useEffect(() => {
    const t = termRef.current
    if (t) t.scrollTop = t.scrollHeight
  }, [run.transcript.length])

  const submit = () => {
    setLines((l) => [...l, input])
    setInput('')
    setHistIdx(null)
    setHelpOpen(false)
    inputRef.current?.focus()
  }

  /** Put a word in place of the partly typed last word. */
  const insert = (word: string) => {
    const endsWithSpace = input === '' || /\s$/.test(input)
    const base = endsWithSpace ? input : input.replace(/\S+$/, '')
    setInput(`${base}${word} `)
    inputRef.current?.focus()
  }

  const tab = () => {
    const words = suggestions.filter((s) => !s.isArg && s.word !== '<Enter>')
    if (words.length === 1) insert((words[0] as { word: string }).word)
    else setHelpOpen(true)
  }

  const history = (dir: -1 | 1) => {
    const typed = lines.filter((l) => l.trim())
    if (!typed.length) return
    const next =
      histIdx === null
        ? dir === -1
          ? typed.length - 1
          : null
        : Math.min(Math.max(histIdx + dir, 0), typed.length)
    if (next === null || next >= typed.length) {
      setHistIdx(null)
      setInput('')
    } else {
      setHistIdx(next)
      setInput(typed[next] as string)
    }
  }

  const chipTap = (s: { word: string; isArg: boolean }) => {
    if (s.word === '<Enter>') submit()
    else if (s.isArg) inputRef.current?.focus()
    else insert(s.word)
  }

  return (
    <div className="cli-q">
      <p className="choice-prompt" id="question-prompt">
        {q.prompt}
      </p>
      <ul className="cli-order" aria-label="Work order">
        {(q.orderText ?? q.requirements.map(describeRequirement)).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <Visuals visuals={q.visuals} />

      <div className="cli-term" ref={termRef} role="log" aria-label="Command line">
        {run.transcript.map((e, i) => (
          <div key={i} className="cli-entry">
            <pre className="cli-line">
              {e.prompt}
              {e.input}
            </pre>
            {e.output.length > 0 && <pre className="cli-out">{e.output.join('\n')}</pre>}
            {e.notes.map((n) => (
              <p key={n} className="cli-note">
                {n}
              </p>
            ))}
          </div>
        ))}
        {!answered && (
          <form
            className="cli-input-row"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <label htmlFor="cli-input" className="cli-prompt">
              {prompt}
            </label>
            <input
              id="cli-input"
              ref={inputRef}
              className="cli-input"
              value={input}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="send"
              aria-describedby="question-prompt"
              onChange={(e) => {
                const v = e.target.value
                // "?" opens the list of what can come next, like IOS help.
                if (v.endsWith('?')) {
                  setInput(v.slice(0, -1))
                  setHelpOpen(true)
                  return
                }
                setInput(v)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault()
                  tab()
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  history(-1)
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  history(1)
                }
              }}
            />
          </form>
        )}
      </div>

      {!answered && (
        <>
          <div className="cli-chips" aria-label="Next word">
            {suggestions.slice(0, MAX_CHIPS).map((s) => (
              <button
                key={s.word}
                type="button"
                className={`cli-chip${s.isArg ? ' is-arg' : ''}`}
                onClick={() => chipTap(s)}
              >
                {s.word}
              </button>
            ))}
          </div>
          <div className="cli-keys">
            <button type="button" className="btn-secondary" onClick={tab}>
              Tab
            </button>
            <button
              type="button"
              className="btn-secondary"
              aria-label="Previous command"
              onClick={() => history(-1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="btn-secondary"
              aria-label="Next command"
              onClick={() => history(1)}
            >
              ↓
            </button>
            <button
              type="button"
              className="btn-secondary"
              aria-expanded={helpOpen}
              onClick={() => setHelpOpen((o) => !o)}
            >
              ?
            </button>
            <button type="button" className="btn-secondary" onClick={submit}>
              Enter
            </button>
          </div>
          {helpOpen && (
            <dl className="cli-help" aria-label="What can come next">
              {suggestions.length === 0 ? (
                <div>
                  <dt>Nothing</dt>
                  <dd>No command in this level continues from here.</dd>
                </div>
              ) : (
                suggestions.map((s) => (
                  <div key={s.word}>
                    <dt>{s.word}</dt>
                    <dd>{s.help}</dd>
                  </div>
                ))
              )}
            </dl>
          )}
          {hintsAllowed && (
            <div className="hint">
              {hintOpen ? (
                <p>Hint: {run.evaluation.problems[0] ?? 'Everything in the work order is done.'}</p>
              ) : (
                <button type="button" className="btn-secondary" onClick={() => setHintOpen(true)}>
                  Show hint
                </button>
              )}
            </div>
          )}
          <div className="cli-actions">
            <button type="button" onClick={() => onAnswer({ lines })}>
              Check work order
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setLines([])
                setHintOpen(false)
              }}
            >
              Start over
            </button>
          </div>
        </>
      )}
    </div>
  )
}
