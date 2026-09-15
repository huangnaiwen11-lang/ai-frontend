import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthApi, type AuthUser } from '../../api/auth'
import { GoApiClient } from '../../api/http'
import { ROUTES } from '../../app/routes'
import { AuthProvider } from '../auth/AuthProvider'
import { BrowserSessionStore } from '../auth/session-store'
import { AppShell } from './AppShell'

const goBaseUrl = 'http://127.0.0.1:18000'

describe('AppShell', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('提供规范导航、品牌首页入口和子页面内容，不展示 Animate', async () => {
    const sessionStore = new BrowserSessionStore()
    vi.stubGlobal('fetch', vi.fn())

    renderShell(sessionStore)

    await waitFor(() => expect(screen.getByRole('link', { name: '登录' })).toBeInTheDocument())
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cling AI' })).toHaveAttribute('href', ROUTES.home)
    expect(screen.getByRole('link', { name: '图片创作' })).toHaveAttribute('href', ROUTES.studioImage)
    expect(screen.getByRole('link', { name: '模板编辑' })).toHaveAttribute('href', ROUTES.studioEdit)
    expect(screen.getByRole('link', { name: '视频创作' })).toHaveAttribute('href', ROUTES.studioVideo)
    expect(screen.getByRole('link', { name: '我的作品' })).toHaveAttribute('href', ROUTES.works)
    expect(screen.getByRole('link', { name: '钱包' })).toHaveAttribute('href', ROUTES.wallet)
    expect(screen.getByRole('link', { name: '通知' })).toHaveAttribute('href', ROUTES.notifications)
    expect(screen.getByRole('link', { name: '用户中心' })).toHaveAttribute('href', ROUTES.account)
    expect(screen.getByRole('link', { name: '反馈与支持' })).toHaveAttribute('href', ROUTES.feedback)
    expect(screen.getByRole('link', { name: '视频创作' }).querySelector('svg')).not.toBeNull()
    expect(screen.getByRole('main')).toHaveTextContent('子页面内容')
    expect(screen.queryByText('Animate')).not.toBeInTheDocument()
  })

  it('登录会话可在壳内退出，并切换回登录入口', async () => {
    const sessionStore = new BrowserSessionStore()
    sessionStore.setToken('go-session-token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ user: sampleUser })))
    const user = userEvent.setup()

    renderShell(sessionStore)

    await screen.findByRole('button', { name: '退出登录' })
    await user.click(screen.getByRole('button', { name: '退出登录' }))

    expect(sessionStore.getToken()).toBeNull()
    expect(screen.getByRole('link', { name: '登录' })).toHaveAttribute('href', ROUTES.login)
    expect(screen.queryByRole('button', { name: '退出登录' })).not.toBeInTheDocument()
  })
})

function renderShell(sessionStore: BrowserSessionStore) {
  const authApi = new AuthApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))

  return render(
    <AuthProvider authApi={authApi} sessionStore={sessionStore}>
      <MemoryRouter initialEntries={[ROUTES.home]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<PageContent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

function PageContent() {
  return <main><p>子页面内容</p></main>
}

const sampleUser = {
  id: 'user-1',
  displayName: '测试用户',
  bindingState: 'bound',
  accountStatus: 'normal',
  contentAccess: 'standard',
  timezone: 'Asia/Shanghai',
  isGuest: false,
} satisfies AuthUser

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
