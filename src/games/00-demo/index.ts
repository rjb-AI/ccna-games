import { ChoiceView } from '../../app/frame/ChoiceView'
import { defineGame } from '../../app/frame/types'
import { makeQuestion } from './generator'
import { LEVELS } from './levels'

export const demoGame = defineGame({
  id: 'demo',
  title: 'Frame Demo',
  domainId: null,
  levels: LEVELS,
  makeQuestion,
  check: (q, response: string) => ({
    correct: response === q.answer,
    given: response,
    expected: q.answer,
    explanation: q.explanation,
  }),
  describe: (q) =>
    q.prompt.startsWith('One of') ? `${q.prompt} (${q.choices.join('; ')})` : q.prompt,
  View: ChoiceView,
})
