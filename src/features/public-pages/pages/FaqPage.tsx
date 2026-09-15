import { PUBLIC_CONTENT, resolvePublicLocale } from '../content/public-content'
import type { PublicLocale } from '../content/public-content'
import { FaqAccordion } from '../components/FaqAccordion'
import { PublicPageLayout } from '../components/PublicPageLayout'

interface FaqPageProps {
  readonly locale?: PublicLocale
}

export function FaqPage({ locale = resolvePublicLocale(navigator.language) }: FaqPageProps) {
  const content = PUBLIC_CONTENT[locale].faq

  return (
    <PublicPageLayout locale={locale} title={content.title}>
      <p>{content.subtitle}</p>
      <FaqAccordion items={content.items} />
    </PublicPageLayout>
  )
}
