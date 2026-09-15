import { useId, useState } from 'react'
import type { DeepReadonly, PublicFaq } from '../content/public-content'

interface FaqAccordionProps {
  readonly items: DeepReadonly<PublicFaq>['items']
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)
  const idPrefix = useId()

  return (
    <section aria-label="FAQ">
      {items.map((item, index) => {
        const answerId = `faq-answer-${idPrefix}-${index}`
        const questionId = `faq-question-${idPrefix}-${index}`
        const isExpanded = expandedQuestion === item.question

        return (
          <section key={item.question}>
            <h2>
              <button
                aria-controls={answerId}
                aria-expanded={isExpanded}
                id={questionId}
                onClick={() => setExpandedQuestion(isExpanded ? null : item.question)}
                type="button"
              >
                {item.question}
              </button>
            </h2>
            <div aria-labelledby={questionId} hidden={!isExpanded} id={answerId} role="region">
              {item.answer}
            </div>
          </section>
        )
      })}
    </section>
  )
}
