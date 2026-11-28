import { BinsView } from './BinsView'
import { ChoiceView } from './ChoiceView'
import { CliView } from './CliView'
import { WireBoardView } from './WireBoardView'
import type { WiresResponse } from './wires'
import { FieldsView } from './FieldsView'
import { LabelsView } from './LabelsView'
import { OrderView } from './OrderView'
import type { FieldsResponse } from './fields'
import type { LabelsResponse } from './labels'
import type { OrderResponse } from './order'
import { type MixedQuestion, type MixedResponse, isCli } from './mixed'
import type { QuestionViewProps } from './types'

export function MixedView(props: QuestionViewProps<MixedQuestion, MixedResponse>) {
  const { question: m, response, ...rest } = props
  if (m.kind === 'cli') {
    return (
      <CliView
        {...rest}
        question={m.q}
        response={response !== null && isCli(response) ? response : null}
      />
    )
  }
  if (m.kind === 'wires') {
    return (
      <WireBoardView
        {...rest}
        question={m.q}
        response={
          response === null ||
          typeof response === 'string' ||
          Array.isArray(response) ||
          isCli(response)
            ? null
            : (response as WiresResponse)
        }
      />
    )
  }
  if (m.kind === 'fields') {
    return (
      <FieldsView
        {...rest}
        question={m.q}
        response={
          response === null ||
          typeof response === 'string' ||
          Array.isArray(response) ||
          isCli(response)
            ? null
            : (response as FieldsResponse)
        }
      />
    )
  }
  if (m.kind === 'order') {
    return (
      <OrderView
        {...rest}
        question={m.q}
        response={Array.isArray(response) ? (response as OrderResponse) : null}
      />
    )
  }
  if (m.kind === 'labels') {
    const View = m.q.display === 'bins' ? BinsView : LabelsView
    return (
      <View
        {...rest}
        question={m.q}
        response={
          response === null ||
          typeof response === 'string' ||
          Array.isArray(response) ||
          isCli(response)
            ? null
            : (response as LabelsResponse)
        }
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
