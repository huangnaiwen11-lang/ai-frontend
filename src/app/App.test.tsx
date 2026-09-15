import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { ROUTES } from './routes'

const PUBLIC_PAGE_CASES = [
  ['/faq', 'Frequently Asked Questions'],
  ['/privacy', 'Privacy Policy'],
  ['/terms', 'Terms of Service'],
  ['/content-policy', 'Content Policy'],
] as const

let navigatorLanguageDescriptor: PropertyDescriptor | undefined

describe('App', () => {
  beforeEach(() => {
    navigatorLanguageDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'language')
    window.sessionStorage.clear()
    vi.stubEnv('VITE_GO_API_BASE_URL', 'http://127.0.0.1:18000')
  })

  afterEach(() => {
    restoreNavigatorLanguage()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it.each(PUBLIC_PAGE_CASES)(
    '带有已有会话时，公共路由 %s 匿名显示 %s 且不发起请求',
    async (pathname, heading) => {
      window.history.pushState({}, '', pathname)
      window.sessionStorage.setItem('ai-frontend-service.go-session-token', 'existing-token')
      setNavigatorLanguage('en-US')
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      render(<App />)

      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      expect(fetchMock).not.toHaveBeenCalled()
      expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeInTheDocument()
      expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument()
      expect(screen.queryByText(/Animate/i)).not.toBeInTheDocument()
    },
  )

  it('在应用壳内提供规范工作室首页与导航', () => {
    window.history.pushState({}, '', '/')

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Cling AI 工作室' })).toBeInTheDocument()
    expect(screen.getByText('新前端仅通过 Go API Gateway 提供创作能力。')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '图片创作' })).toHaveAttribute('href', ROUTES.studioImage)
    expect(screen.getByRole('link', { name: '模板编辑' })).toHaveAttribute('href', ROUTES.studioEdit)
    expect(screen.getByRole('link', { name: '视频创作' })).toHaveAttribute('href', ROUTES.studioVideo)
    expect(screen.getByRole('link', { name: '我的作品' })).toHaveAttribute('href', ROUTES.works)
    expect(screen.getByRole('link', { name: '钱包' })).toHaveAttribute('href', ROUTES.wallet)
    expect(screen.queryByText('Animate')).not.toBeInTheDocument()
  })

  it('已登录访问首页沿用旧 HomeGate 进入视频入口，不停留在说明页', async () => {
    window.history.pushState({}, '', '/')
    window.sessionStorage.setItem('ai-frontend-service.go-session-token', 'existing-token')
    vi.stubGlobal('fetch', vi.fn(async (url: string) => jsonResponse(url.endsWith('/me')
      ? { user: { id: 'user-1', displayName: '本地用户', bindingState: 'bound', accountStatus: 'normal', contentAccess: 'standard', timezone: 'Asia/Shanghai', isGuest: false } }
      : { items: [], total: 0 })))
    render(<App />)
    expect(await screen.findByRole('heading', { name: '视频创作' })).toBeInTheDocument()
    expect(window.location.pathname).toBe(ROUTES.studioVideo)
  })

  it('已登录的反馈入口不能被外层匿名路由强制跳回登录', async () => {
    window.history.pushState({}, '', ROUTES.feedback)
    window.sessionStorage.setItem('ai-frontend-service.go-session-token', 'existing-token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ user: {
      id: 'user-1', displayName: '本地用户', bindingState: 'bound', accountStatus: 'normal',
      contentAccess: 'standard', timezone: 'Asia/Shanghai', isGuest: false,
    } })))
    render(<App />)
    expect(await screen.findByRole('button', { name: '提交反馈' })).toBeInTheDocument()
    expect(window.location.pathname).toBe(ROUTES.feedback)
  })

  it('未登录访问反馈仍跳转到登录且不写入反馈', async () => {
    window.history.pushState({}, '', ROUTES.feedback)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    expect(await screen.findByRole('heading', { name: '登录' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('废弃 Animate 深链只跳至视频创作并丢弃旧查询参数', async () => {
    window.history.pushState({}, '', '/create/animate?template=x&prompt=y&autoSubmit=true')

    render(<App />)

    expect(await screen.findByRole('heading', { name: '视频创作' })).toBeInTheDocument()
    expect(screen.queryByText('Animate')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe(ROUTES.studioVideo)
    expect(window.location.search).toBe('')
  })

  it('临时 payment 兼容地址跳至规范钱包路由', async () => {
    window.history.pushState({}, '', '/payment?legacyOrder=old-1')

    render(<App />)

    expect(await screen.findByRole('heading', { name: '充值' })).toBeInTheDocument()
    expect(window.location.pathname).toBe(ROUTES.wallet)
    expect(window.location.search).toBe('')
  })

  it('规范作品路由在应用壳内加载 Go 作品历史页面', async () => {
    window.history.pushState({}, '', ROUTES.works)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [], nextCursor: null })))

    render(<App />)

    expect(await screen.findByRole('heading', { name: '我的作品' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument()
  })

  it.each([
    [ROUTES.login, '登录'],
    [ROUTES.register, '注册'],
  ])('认证页 %s 位于应用壳外', (pathname, heading) => {
    window.history.pushState({}, '', pathname)

    render(<App />)

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '钱包' })).not.toBeInTheDocument()
  })

  it('用户中心仅渲染 Go 会话身份页，不显示旧占位或发起业务查询', async () => {
    window.history.pushState({}, '', ROUTES.account)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByRole('heading', { name: '用户中心' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('请登录后查看用户中心')
    expect(screen.queryByText('账户中心暂不可用。')).not.toBeInTheDocument()
    expect(screen.queryByText(/余额/)).not.toBeInTheDocument()
    // 导航中的“我的作品”属于应用壳，不应被误认为账户中心已加载作品数据。
    expect(screen.queryByRole('heading', { name: '我的作品' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '通知' })).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('未登录访问视频创作时只通过 Go 目录展示返回的 SFW 模板', async () => {
    window.history.pushState({}, '', ROUTES.studioVideo)
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [{ id: 'video-sfw', title: '安全视频模板', type: 'video', contentRating: 'sfw' }],
        total: 1,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByRole('option', { name: '安全视频模板' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'NSFW 视频模板' })).not.toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://127.0.0.1:18000/api/homepage/video-templates')
    expect(new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit).headers).has('Authorization')).toBe(false)
  })
})

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

function setNavigatorLanguage(language: string) {
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: language,
  })
}

function restoreNavigatorLanguage() {
  if (navigatorLanguageDescriptor) {
    Object.defineProperty(window.navigator, 'language', navigatorLanguageDescriptor)
    return
  }
  Reflect.deleteProperty(window.navigator, 'language')
}
