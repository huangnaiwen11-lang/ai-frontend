import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../app/routes'
import './auth-page.css'

/** 认证页共用旧主站品牌与法律入口，避免登录和注册产生不同的信任提示。 */
export function AuthPageLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="auth-page">
      <img className="auth-page__background" src="/legacy/auth/login-bg-cling-main.webp" alt="" aria-hidden="true" />
      <header className="auth-page__header">
        <Link className="auth-page__close" to={ROUTES.home} aria-label="关闭" title="关闭">
          <X size={20} aria-hidden="true" />
        </Link>
        <span className="auth-page__brand" role="img" aria-label="Cling AI">Cling<span>AI</span></span>
      </header>
      <div className="auth-page__body">
        <section className="auth-page__panel" aria-labelledby="auth-page-title">
          <h1 id="auth-page-title">{title}</h1>
          {children}
          <footer className="auth-page__legal">
            使用 Cling AI 即表示你同意我们的{' '}
            <Link to={ROUTES.terms}>服务条款</Link>和<Link to={ROUTES.privacy}>隐私政策</Link>。
          </footer>
        </section>
      </div>
    </main>
  )
}
