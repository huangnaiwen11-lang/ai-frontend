import type { ReactNode } from "react";
import { ROUTES } from "../../../app/routes";
import type { PublicLocale } from "../content/public-content";

interface PublicPageLayoutProps {
  readonly children: ReactNode;
  readonly locale: PublicLocale;
  readonly title: string;
}

const publicRoutes = [
  { key: "faq", href: ROUTES.faq },
  { key: "privacy", href: ROUTES.privacy },
  { key: "terms", href: ROUTES.terms },
  { key: "contentPolicy", href: ROUTES.contentPolicy },
  { key: "feedback", href: ROUTES.feedback },
] as const;

export function PublicPageLayout({
  children,
  locale,
  title,
}: PublicPageLayoutProps) {
  const labels =
    locale === "zh"
      ? ["常见问题", "隐私政策", "服务条款", "内容政策", "反馈与支持"]
      : ["FAQ", "Privacy", "Terms", "Content Policy", "Feedback"];

  return (
    <main>
      {/* 公共页面不读取会话，避免访问无需认证的原文时产生状态依赖。 */}
      <nav
        aria-label={
          locale === "zh" ? "公共页面导航" : "Public pages navigation"
        }
      >
        {publicRoutes.map((route, index) => (
          <a href={route.href} key={route.key}>
            {labels[index]}
          </a>
        ))}
      </nav>
      <h1>{title}</h1>
      {children}
    </main>
  );
}
