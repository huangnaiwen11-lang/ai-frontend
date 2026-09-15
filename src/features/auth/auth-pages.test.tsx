import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthApi } from '../../api/auth'
import { GoApiClient } from '../../api/http'
import { AuthProvider, useAuth } from './AuthProvider'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'
import { BrowserSessionStore } from './session-store'

const ageKey = 'ai-frontend-service.age-confirmed'
const account = { id: 'u1', displayName: '测试', bindingState: 'bound', accountStatus: 'normal', contentAccess: 'standard', timezone: 'Asia/Shanghai', isGuest: false }
const response = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } })

// 路由探针验证真实页面提交的落点，避免仅断言 navigate mock 掩盖恢复失败。
function LocationProbe() { return <output data-testid="auth-location">{useLocation().pathname}</output> }
function mountPage(kind: '登录' | '注册') {
  const sessionStore = new BrowserSessionStore()
  const authApi = new AuthApi(new GoApiClient({ baseUrl: 'http://go.test', sessionStore }))
  return render(<MemoryRouter initialEntries={[kind === '登录' ? '/login' : '/register']}><AuthProvider authApi={authApi} sessionStore={sessionStore}>{kind === '登录' ? <LoginPage /> : <RegisterPage />}<LocationProbe /></AuthProvider></MemoryRouter>)
}

function SessionProbe() {
  const { sessionRestoreState, user } = useAuth()
  return <output data-testid="auth-session">{sessionRestoreState}:{user?.id}</output>
}

// Routes 真正卸载离开的认证页；StrictMode 同时覆盖 effect 的 setup/cleanup/setup。
function mountRoutedPage(kind: '登录' | '注册') {
  const sessionStore = new BrowserSessionStore()
  const authApi = new AuthApi(new GoApiClient({ baseUrl: 'http://go.test', sessionStore }))
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[kind === '登录' ? '/login' : '/register']}>
        <AuthProvider authApi={authApi} sessionStore={sessionStore}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/terms" element={<><h1>服务条款页面</h1><Link to={kind === '登录' ? '/login' : '/register'}>返回认证</Link></>} />
            <Route path="/" element={<h1>首页</h1>} />
          </Routes>
          <LocationProbe />
          <SessionProbe />
        </AuthProvider>
      </MemoryRouter>
    </StrictMode>,
  )
}

async function submitCredentials(kind: '登录' | '注册') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('邮箱'), 'test@example.com')
  await user.type(screen.getByLabelText('密码'), 'password123')
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: kind }))
  return user
}

describe('认证页品牌布局与明确年龄确认', () => {
  beforeEach(() => { window.sessionStorage.clear(); window.localStorage.clear() })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it.each(['登录', '注册'] as const)('%s 共享旧主站品牌、真实背景及退出和法律入口', (kind) => {
    mountPage(kind)
    expect(screen.getByRole('img', { name: 'Cling AI' })).toBeInTheDocument()
    expect(document.querySelector('.auth-page__background')).toHaveAttribute('src', '/legacy/auth/login-bg-cling-main.webp')
    expect(screen.getByRole('link', { name: '关闭' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: '服务条款' })).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: '隐私政策' })).toHaveAttribute('href', '/privacy')
  })

  it.each(['登录', '注册'] as const)('%s 未主动确认 18 岁前不能发送请求', async (kind) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    window.localStorage.setItem('ageVerified', 'true')
    mountPage(kind)
    const checkbox = screen.getByRole('checkbox', { name: '我确认已年满 18 周岁' })
    expect(checkbox).not.toBeChecked()
    expect(screen.getByRole('button', { name: kind })).toBeDisabled()
    fireEvent.submit(screen.getByRole('button', { name: kind }).closest('form')!)
    expect(fetchMock).not.toHaveBeenCalled()
    await userEvent.click(checkbox)
    expect(screen.getByRole('button', { name: kind })).toBeEnabled()
    expect(window.localStorage.getItem(ageKey)).toBe('true')
    await userEvent.click(checkbox)
    expect(window.localStorage.getItem(ageKey)).toBeNull()
  })

  it('读取本项目年龄确认，且不读取旧身份存储', () => {
    window.localStorage.setItem(ageKey, 'true')
    const spy = vi.spyOn(Storage.prototype, 'getItem')
    mountPage('登录')
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(spy.mock.calls.every(([key]) => key.startsWith('ai-frontend-service.'))).toBe(true)
  })

  it('localStorage 不可用时仍允许当次主动确认', async () => {
    const storage = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('storage blocked') })
    mountPage('注册')
    expect(storage).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(storage).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByRole('button', { name: '注册' })).toBeEnabled()
  })

  it('登录必须等 /me 恢复成功后才进入首页', async () => {
    let resolveMe!: (value: Response) => void
    const me = new Promise<Response>((resolve) => { resolveMe = resolve })
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ token: 'go-token', user: account })).mockReturnValueOnce(me)
    vi.stubGlobal('fetch', fetchMock)
    mountPage('登录')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('邮箱'), 'test@example.com')
    await user.type(screen.getByLabelText('密码'), 'password123')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: '登录' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'test@example.com', password: 'password123' })
    expect(screen.getByTestId('auth-location')).toHaveTextContent('/login')
    await act(async () => { resolveMe(response({ user: account })) })
    await waitFor(() => expect(screen.getByTestId('auth-location').textContent).toBe('/'))
  })

  it.each(['登录', '注册'] as const)('%s 同一批事件重复提交只发送一次 Go 请求', async (kind) => {
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    mountPage(kind)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('邮箱'), 'test@example.com')
    await user.type(screen.getByLabelText('密码'), 'password123')
    if (kind === '注册') await user.type(screen.getByLabelText('显示名称'), '测试昵称')
    await user.click(screen.getByRole('checkbox'))
    const form = screen.getByRole('button', { name: kind }).closest('form')!
    act(() => { fireEvent.submit(form); fireEvent.submit(form) })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(kind === '登录'
      ? { email: 'test@example.com', password: 'password123' }
      : { email: 'test@example.com', password: 'password123', displayName: '测试昵称', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai' })
  })

  it.each(['登录', '注册'] as const)('%s 后 /me 失败仍留在当前页', async (kind) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ token: 'go-token', user: account })).mockResolvedValueOnce(new Response(JSON.stringify({ success: false, code: 'UNAVAILABLE', message: '维护中' }), { status: 503, headers: { 'Content-Type': 'application/json' } })))
    mountPage(kind)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('邮箱'), 'test@example.com')
    await user.type(screen.getByLabelText('密码'), 'password123')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: kind }))
    expect(await screen.findByRole('alert')).toHaveTextContent('维护中')
    expect(screen.getByTestId('auth-location')).toHaveTextContent(kind === '登录' ? '/login' : '/register')
  })

  it.each([
    ['登录', true], ['注册', true], ['登录', false], ['注册', false],
  ] as const)('%s 离开表单后迟到的响应（成功=%s）不覆盖条款页面', async (kind, success) => {
    let resolveLogin!: (value: Response) => void
    let resolveMe!: (value: Response) => void
    const fetchMock = vi.fn()
      .mockReturnValueOnce(new Promise<Response>((resolve) => { resolveLogin = resolve }))
      .mockReturnValueOnce(new Promise<Response>((resolve) => { resolveMe = resolve }))
    vi.stubGlobal('fetch', fetchMock)
    mountRoutedPage(kind)
    const user = await submitCredentials(kind)
    await user.click(screen.getByRole('link', { name: '服务条款' }))
    expect(screen.queryByLabelText('邮箱')).not.toBeInTheDocument()
    expect(screen.getByTestId('auth-location')).toHaveTextContent('/terms')
    await act(async () => { resolveLogin(response({ token: 'go-token', user: account })) })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await act(async () => {
      resolveMe(success ? response({ user: account }) : new Response(JSON.stringify({ success: false, code: 'UNAVAILABLE', message: '迟到的错误' }), { status: 503, headers: { 'Content-Type': 'application/json' } }))
    })
    expect(screen.getByTestId('auth-session')).toHaveTextContent(success ? 'ready:u1' : 'failed:')
    expect(screen.getByTestId('auth-location')).toHaveTextContent('/terms')
    expect(screen.getByRole('heading', { name: '服务条款页面' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '返回认证' }))
    expect(screen.getByLabelText('邮箱')).toHaveValue('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: kind })).toBeEnabled()
  })

  it.each(['登录', '注册'] as const)('%s 在 StrictMode 重建 effect 后仍能正常完成导航', async (kind) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ token: 'go-token', user: account })).mockResolvedValueOnce(response({ user: account })))
    mountRoutedPage(kind)
    await submitCredentials(kind)
    expect(await screen.findByRole('heading', { name: '首页' })).toBeInTheDocument()
    expect(screen.getByTestId('auth-session')).toHaveTextContent('ready:u1')
  })
})
