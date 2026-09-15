import { PUBLIC_CONTENT, resolvePublicLocale } from '../content/public-content'
import type { PublicLocale } from '../content/public-content'
import { PublicPageLayout } from '../components/PublicPageLayout'

type PublicDocumentKey = 'privacy' | 'terms' | 'contentPolicy'

interface DocumentPageProps {
  readonly documentKey: PublicDocumentKey
  readonly locale?: PublicLocale
}

export function DocumentPage({
  documentKey,
  locale = resolvePublicLocale(navigator.language),
}: DocumentPageProps) {
  const document = PUBLIC_CONTENT[locale][documentKey]

  return (
    <PublicPageLayout locale={locale} title={document.title}>
      <p>{document.lastUpdated}</p>
      {document.intro ? <p>{document.intro}</p> : null}
      {/* 原文中的换行是法律文本的一部分，渲染时必须保留。 */}
      {document.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{section.content}</p>
        </section>
      ))}
      {document.feedbackHint ? <p>{document.feedbackHint}</p> : null}
    </PublicPageLayout>
  )
}
