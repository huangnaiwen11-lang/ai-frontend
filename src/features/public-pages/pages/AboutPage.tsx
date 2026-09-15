import { FileText, Image, MessageSquare, ShieldCheck, Sparkles, Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../app/routes'
import './about-page.css'

const capabilities = [
  { icon: Image, title: '文生图', description: '从文字意图开始完成图片创作。' },
  { icon: Sparkles, title: '模板图编辑', description: '选择模板后编辑自己的图片素材。' },
  { icon: Video, title: '模板图生视频', description: '先确定首帧，再由服务端编排视频生成。' },
] as const

/**
 * 关于页是纯公开说明，不读取会话或业务数据。
 * 能力清单与当前产品边界保持一致，避免展示已经停止的入口。
 */
export function AboutPage() {
  return (
    <main className="about-page" aria-labelledby="about-title">
      <section className="about-page__hero">
        <p className="about-page__eyebrow">CLING AI</p>
        <h1 id="about-title">关于 Cling AI</h1>
        <p>一个专注于图片、模板编辑与视频创作的 AI 工作室。</p>
      </section>

      <section aria-labelledby="about-capabilities-title">
        <h2 id="about-capabilities-title">创作能力</h2>
        <div className="about-page__capabilities">
          {capabilities.map(({ icon: Icon, title, description }) => (
            <article key={title} className="about-page__capability">
              <Icon aria-hidden="true" size={22} />
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="about-links-title">
        <h2 id="about-links-title">更多信息</h2>
        <nav className="about-page__links" aria-label="关于页面链接">
          <Link to={ROUTES.terms}><FileText aria-hidden="true" size={18} />使用条款</Link>
          <Link to={ROUTES.privacy}><ShieldCheck aria-hidden="true" size={18} />隐私政策</Link>
          <Link to={ROUTES.contentPolicy}><ShieldCheck aria-hidden="true" size={18} />内容政策</Link>
          <Link to={ROUTES.feedback}><MessageSquare aria-hidden="true" size={18} />反馈与支持</Link>
        </nav>
      </section>

      <p className="about-page__version">Cling AI 本地重构版</p>
    </main>
  )
}
