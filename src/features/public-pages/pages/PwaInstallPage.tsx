import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './pwa-install-page.css'

/** 浏览器在安装条件满足时派发的原生事件；不同内核没有统一的 DOM 类型声明。 */
type DeferredInstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isDeferredInstallPromptEvent(event: Event): event is DeferredInstallPromptEvent {
  return typeof (event as Partial<DeferredInstallPromptEvent>).prompt === 'function'
}

/**
 * PWA 安装落地页只使用浏览器自身的安装能力，不读取登录态、模板或用户数据。
 * 这样即使用户从广告、书签或系统分享进入，也不会在静态页面泄露私人内容。
 */
export function PwaInstallPage() {
  const navigate = useNavigate()
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPromptEvent | null>(null)
  const [installState, setInstallState] = useState<'idle' | 'installing' | 'installed'>('idle')

  useEffect(() => {
    const rememberPrompt = (event: Event) => {
      if (!isDeferredInstallPromptEvent(event)) return
      // 阻止浏览器立即展示气泡，把明确的安装时机交还给用户。
      event.preventDefault()
      setDeferredPrompt(event)
    }
    const markInstalled = () => {
      setDeferredPrompt(null)
      setInstallState('installed')
    }

    window.addEventListener('beforeinstallprompt', rememberPrompt)
    window.addEventListener('appinstalled', markInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', rememberPrompt)
      window.removeEventListener('appinstalled', markInstalled)
    }
  }, [])

  async function requestInstall() {
    if (!deferredPrompt || installState === 'installing') return
    setInstallState('installing')
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setInstallState('installed')
        setDeferredPrompt(null)
      } else {
        setInstallState('idle')
      }
    } catch {
      // 安装窗口属于浏览器控制范围；失败时保留手动安装说明，不误报为已安装。
      setInstallState('idle')
    }
  }

  return (
    <main className="pwa-install-page" aria-labelledby="pwa-install-title">
      <section className="pwa-install-page__card">
        <img
          className="pwa-install-page__banner"
          src="/legacy/banners/pwa-install-wide.webp"
          alt="Cling AI 创作工作室"
        />
        <p className="pwa-install-page__eyebrow">CLING AI</p>
        <h1 id="pwa-install-title">安装 Cling AI</h1>
        <p>安装到主屏幕后，可像普通应用一样更快打开图片创作、模板编辑和视频创作。</p>

        {installState === 'installed' ? (
          <p className="pwa-install-page__success" role="status">已发送安装请求；完成后可从设备主屏幕打开 Cling AI。</p>
        ) : deferredPrompt ? (
          <button type="button" className="pwa-install-page__primary" disabled={installState === 'installing'} onClick={() => void requestInstall()}>
            {installState === 'installing' ? '正在打开安装窗口…' : '安装应用'}
          </button>
        ) : (
          <p className="pwa-install-page__hint">若浏览器没有显示安装按钮，请在浏览器菜单中选择“添加到主屏幕”或“安装应用”。</p>
        )}

        <button type="button" className="pwa-install-page__secondary" onClick={() => navigate('/')}>进入网页版</button>
      </section>
    </main>
  )
}
