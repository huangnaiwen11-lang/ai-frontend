import { ArrowRight, CheckCircle2, LockKeyhole, Play, Sparkles, WandSparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAgeConfirmation } from '../auth/useAgeConfirmation'
import { ROUTES } from '../../app/routes'
import './public-home.css'

/**
 * 访客首页保留旧站首页使用的本地图片、内容顺序与「先登录、后创作」意图。
 * 它不请求旧 Node 首页接口，也不会把首页任何点击变成自动创建任务。
 */
export function PublicHomePage() {
  const { ageConfirmed, confirmAge } = useAgeConfirmation()
  const navigate = useNavigate()
  const goToLogin = () => navigate(ROUTES.login)

  // 年龄确认前不渲染内容树，避免图片、按钮或文本先于明确确认暴露。
  if (!ageConfirmed) return <AgeGate onConfirm={() => confirmAge(true)} />

  return <main className="public-home">
    <header className="public-home__nav">
      <Link to={ROUTES.home} className="public-home__brand" aria-label="Cling AI 首页">
        <span>Cling</span><strong>AI</strong>
      </Link>
      <nav className="public-home__nav-links" aria-label="访客首页导航">
        {['模板编辑', '图片创作', '视频创作'].map((label) => (
          <button type="button" key={label} onClick={goToLogin}>{label}</button>
        ))}
      </nav>
      <div className="public-home__nav-actions">
        <button type="button" className="public-home__login" onClick={goToLogin}>登录</button>
        <button type="button" className="public-home__cta public-home__cta--compact" onClick={goToLogin}>免费开始</button>
      </div>
    </header>

    <section className="public-home__hero" aria-labelledby="home-title">
      <div className="public-home__hero-copy">
        <p className="public-home__eyebrow"><Sparkles size={14} /> Cling AI Studio</p>
        <h1 id="home-title">用 AI 释放你的创作想象</h1>
        <p className="public-home__lead">从文字生成图片、编辑模板图，到使用首帧生成视频。选择想做的事，登录后再开始创作。</p>
        <div className="public-home__hero-actions">
          <button type="button" className="public-home__cta" onClick={goToLogin}>免费开始创作 <ArrowRight size={17} /></button>
          <button type="button" className="public-home__secondary-cta" onClick={goToLogin}>已有账号，去登录</button>
        </div>
        <p className="public-home__notice"><LockKeyhole size={14} /> 创建前需登录；访客页面不会提交生成任务。</p>
      </div>

      <div className="public-home__studio" aria-label="Cling AI 创作能力展示">
        <div className="public-home__studio-bar"><span /><span /><span /><b>Cling Studio</b></div>
        <div className="public-home__studio-grid">
          <button type="button" className="public-home__hero-image" onClick={goToLogin}>
            <img src="/legacy/images/homepage/lux-black-marble-portrait.webp" alt="主视觉：黑色大理石人像" />
            <span className="public-home__image-tag"><Play size={15} fill="currentColor" /> 视频创作</span>
            <span className="public-home__image-caption">从一张图开始，生成你的创作作品</span>
          </button>
          <div className="public-home__studio-side">
            <section className="public-home__workflow" aria-label="创作流程">
              <div><p>创作流程</p><h2>三步开始</h2></div><WandSparkles size={20} />
              {['输入创意或选择模板', '生成图片或编辑图像', '用首帧生成视频'].map((text, index) => (
                <button type="button" key={text} onClick={goToLogin}><i>{index + 1}</i>{text}<ArrowRight size={14} /></button>
              ))}
            </section>
            <div className="public-home__mini-gallery">
              <button type="button" onClick={goToLogin}><img src="/legacy/images/homepage/lux-burgundy-lounge-portrait.webp" alt="酒红休息室人像作品示例" /></button>
              <button type="button" onClick={goToLogin}><img src="/legacy/images/homepage/lux-black-corridor-portrait.webp" alt="黑色走廊人像作品示例" /></button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="public-home__proof" aria-label="产品特性">
      <div><Sparkles size={18} /><strong>图片、模板与视频</strong><span>三类基础创作能力</span></div>
      <div><CheckCircle2 size={18} /><strong>登录后开始</strong><span>不会在访客页自动生成</span></div>
      <div><LockKeyhole size={18} /><strong>你的作品归你</strong><span>在“我的作品”里查看</span></div>
    </section>

    <section className="public-home__tools" aria-labelledby="tools-title">
      <header><p>创作工具</p><h2 id="tools-title">选一种方式，把想法做出来</h2><span>工具入口保持旧站的“先登录”行为，进入后再由你主动选择模板与提交。</span></header>
      <div className="public-home__tool-grid">
        {TOOL_CARDS.map((tool) => <button type="button" key={tool.title} className="public-home__tool" onClick={goToLogin}>
          <img src={tool.image} alt="" />
          <span className="public-home__tool-shade" />
          <span className="public-home__tool-content"><b>{tool.title}</b><small>{tool.description}</small><em>{tool.badge}</em></span>
        </button>)}
      </div>
    </section>

    <section className="public-home__gallery" aria-labelledby="gallery-title">
      <div className="public-home__gallery-copy"><p>作品展示</p><h2 id="gallery-title">从灵感到成片，保持你的选择权</h2><span>主页只展示本地迁移的原始视觉素材；实际创作的模板、输入和提交全部在登录后的工作室完成。</span><button type="button" className="public-home__secondary-cta" onClick={goToLogin}>登录后开始 <ArrowRight size={16} /></button></div>
      <div className="public-home__gallery-grid">
        <img className="public-home__gallery-large" src="/legacy/images/homepage/lux-gold-satin-wide.webp" alt="金色缎面作品示例" />
        <img src="/legacy/images/homepage/lux-city-window-wide.webp" alt="城市窗边作品示例" />
        <img src="/legacy/images/homepage/lux-black-marble-portrait.webp" alt="黑色大理石作品示例" />
        <img className="public-home__gallery-wide" src="/legacy/images/homepage/lux-hotel-walk-wide.webp" alt="酒店走廊作品示例" />
      </div>
    </section>

    <section className="public-home__closing"><p>现在开始</p><h2>把第一个创作想法交给自己完成。</h2><button type="button" className="public-home__cta" onClick={goToLogin}>免费开始创作 <ArrowRight size={17} /></button></section>

    <footer className="public-home__footer"><div className="public-home__brand"><span>Cling</span><strong>AI</strong></div><p>图片、模板编辑与视频创作。</p><nav aria-label="页脚链接"><Link to={ROUTES.faq}>常见问题</Link><Link to={ROUTES.privacy}>隐私政策</Link><Link to={ROUTES.terms}>使用条款</Link></nav></footer>
  </main>
}

/** 年龄门禁是独立页面：确认前刻意不挂载首页任何内容。 */
function AgeGate({ onConfirm }: { onConfirm(): void }) {
  return <main className="public-home__age-gate">
    <section className="public-home__age-card" aria-labelledby="age-title">
      <div className="public-home__age-mark">18+</div><p>Cling AI</p><h1 id="age-title">年龄确认</h1>
      <span>本网站包含仅适合成年人的创作内容。继续访问即表示你已年满 18 周岁，并同意遵守 <Link to={ROUTES.terms}>使用条款</Link> 与 <Link to={ROUTES.privacy}>隐私政策</Link>。</span>
      <button type="button" className="public-home__cta" onClick={onConfirm}>我已满 18 岁，进入网站 <ArrowRight size={17} /></button>
      <a className="public-home__age-exit" href="https://www.google.com/">未满 18 岁，离开网站</a><small>你的确认会保存在当前浏览器中。</small>
    </section>
  </main>
}

const TOOL_CARDS = [
  { title: '模板图片编辑', description: '选择模板后编辑你的图片', badge: '热门', image: '/legacy/images/homepage/lux-gold-satin-wide.webp' },
  { title: '图片创作', description: '从文字开始生成一张图片', badge: '图片', image: '/legacy/images/homepage/lux-black-marble-portrait.webp' },
  { title: '视频创作', description: '先生成首帧，再生成视频', badge: '视频', image: '/legacy/images/homepage/lux-hotel-walk-wide.webp' },
] as const
