import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  it.each(['/payment/result', '/recharge', '/payment', '/wallet'])('支付回跳 %s 只保留单个订单编号并查询 Go', async (path) => {
    window.history.pushState({}, '', `${path}?orderId=order-1&status=success&price=1`)
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ orderId: 'order-1', productId: 'coins_100', status: 'pending', provider: 'paycores', amountCents: 299, currency: 'USD', credits: 100, paymentReceived: false, backendReady: false }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    expect(await screen.findByText('等待付款确认')).toBeInTheDocument()
    expect(fetchMock.mock.calls.every(([url, options]) => url.endsWith('/api/payments/order-status/order-1') && options.method === 'GET')).toBe(true)
    expect(screen.queryByText('支付成功，钻石已到账')).not.toBeInTheDocument()
  })
  it.each([
    ['/video', '视频创作', ROUTES.studioVideo],
    ['/image', '模板图片编辑', ROUTES.studioEdit],
    ['/faceswap', '模板图片编辑', ROUTES.studioEdit],
  ])('旧主导航 %s 进入对应创作目录，不自动生成', async (path, title, target) => {
    window.history.pushState({}, '', `${path}?autoSubmit=true`)
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [], total: 0 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    expect(window.location.pathname).toBe(target)
    expect(window.location.search).toBe('')
    expect(fetchMock.mock.calls.every(([, options]) => !options?.method || options.method === 'GET')).toBe(true)
  })

  it.each([['/legal/privacy', 'Privacy Policy'], ['/legal/terms', 'Terms of Service']])('法律别名 %s 不恢复登录、不发请求', async (path, title) => {
    window.history.pushState({}, '', path)
    window.sessionStorage.setItem('ai-frontend-service.go-session-token', 'existing-token')
    setNavigatorLanguage('en-US')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  beforeEach(() => {
    navigatorLanguageDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'language')
    window.sessionStorage.clear()
    window.localStorage.clear()
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

  it('未确认年龄时首页只显示年龄确认，不挂载成人内容或应用壳', async () => {
    window.history.pushState({}, '', '/')

    render(<App />)

    expect(await screen.findByRole('heading', { name: '年龄确认' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '用 AI 释放你的创作想象' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument()
    expect(screen.queryByText('Animate')).not.toBeInTheDocument()
  })

  it('确认年龄后展示使用原迁移图片的访客首页，所有创作入口仅去登录页', async () => {
    window.history.pushState({}, '', '/')
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: '我已满 18 岁，进入网站' }))

    expect(screen.getByRole('heading', { name: '用 AI 释放你的创作想象' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '主视觉：黑色大理石人像' })).toHaveAttribute('src', '/legacy/images/homepage/lux-black-marble-portrait.webp')
    const createButtons = screen.getAllByRole('button', { name: '免费开始创作' })
    expect(createButtons).toHaveLength(2)
    expect(screen.getByRole('link', { name: '隐私政策' })).toHaveAttribute('href', ROUTES.privacy)
    expect(screen.queryByText('Animate')).not.toBeInTheDocument()

    await userEvent.click(createButtons[0])
    expect(window.location.pathname).toBe(ROUTES.login)
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
    expect(screen.getAllByRole('option')).toHaveLength(6)
    expect(screen.getByRole('option', { name: '表扬与好评' })).toBeInTheDocument()
    expect(screen.getByLabelText('反馈截图')).toHaveAttribute('type', 'file')
    expect(window.location.pathname).toBe(ROUTES.feedback)
  })

  it('反馈截图先走 Go 素材接口，提交时只传经服务端验证的素材 ID', async () => {
    window.history.pushState({}, '', ROUTES.feedback)
    window.sessionStorage.setItem('ai-frontend-service.go-session-token', 'existing-token')
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/api/auth/me')) return jsonResponse({ user: {
        id: 'user-1', displayName: '本地用户', bindingState: 'bound', accountStatus: 'normal',
        contentAccess: 'standard', timezone: 'Asia/Shanghai', isGuest: false,
      } })
      if (url.endsWith('/api/media/images')) return jsonResponse({
        id: 'media-1', reference: 'https://uploads.example.test/assets/media-1', contentType: 'image/png', sizeBytes: 3, downloadUrl: '/api/media/images/media-1',
      })
      if (url.endsWith('/api/feedback')) {
        expect(init?.body).toBe(JSON.stringify({
          type: 'payment', message: '支付成功但钻石没有到账，请帮忙核实。', email: '', attachments: [{ id: 'media-1' }],
        }))
        return jsonResponse({ feedbackId: 'feedback-1' })
      }
      throw new Error(`unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await screen.findByRole('button', { name: '提交反馈' })
    await userEvent.selectOptions(screen.getByLabelText('反馈类型'), 'payment')
    await userEvent.upload(screen.getByLabelText('反馈截图'), new File(['png'], 'receipt.png', { type: 'image/png' }))
    await screen.findByText('已上传 1 张反馈截图')
    await userEvent.type(screen.getByLabelText('反馈内容'), '支付成功但钻石没有到账，请帮忙核实。')
    await userEvent.click(screen.getByRole('button', { name: '提交反馈' }))
    expect(await screen.findByText('反馈已提交，感谢你的反馈。')).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/feedback'))).toHaveLength(1)
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

    expect(await screen.findByRole('heading', { name: '钻石充值' })).toBeInTheDocument()
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
