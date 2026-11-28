import { ChoiceView } from './ChoiceView'
import { FieldsView } from './FieldsView'
import type { MixedQuestion, MixedResponse } from './mixed'
import type { QuestionViewProps } from './types'

export function MixedView(props: QuestionViewProps<MixedQuestion, MixedResponse>) {
  const { question: m, response, ...rest } = props
  if (m.kind === 'fields') {
    return (
      <FieldsView
        {...rest}
        question={m.q}
        response={response === null || typeof response === 'string' ? null : response}
      />
    )
  }
  return (
    <ChoiceView
      {...rest}
      question={m.q}
      response={typeof response === 'string' ? response : null}
    />
  )
}
