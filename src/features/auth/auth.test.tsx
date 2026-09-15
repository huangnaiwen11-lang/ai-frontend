import { act, render, screen, waitFor } from '@testing-library/react'
import { StrictMode, type ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthApi, type AuthUser, type ContentAccess } from '../../api/auth'
import { GoApiClient } from '../../api/http'
import { AuthProvider, useAuth } from './AuthProvider'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'
import { AccountPage } from '../account/AccountPage'
import { BrowserSessionStore } from './session-store'

const goBaseUrl = 'http://127.0.0.1:18000'

describe('Go 自有账号入口', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    // 原有用例关注 Go 会话合同，显式记录已完成本项目年龄确认。
    window.localStorage.setItem('ai-frontend-service.age-confirmed', 'true')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('登录仅调用 Go 路径，并以 /me 恢复当前用户', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ token: 'go-session-token', user: sampleUser }))
      .mockResolvedValueOnce(jsonResponse({ user: sampleUser }))
    vi.stubGlobal('fetch', fetchMock)
    const sessionStore = new BrowserSessionStore()
    const authApi = new AuthApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))
    const user = userEvent.setup()

    renderWithRouter(
      <AuthProvider authApi={authApi} sessionStore={sessionStore}>
        <LoginPage />
      </AuthProvider>,
    )
    await user.type(screen.getByLabelText('邮箱'), 'test@example.com')
    await user.type(screen.getByLabelText('密码'), 'password123')
    await user.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(sessionStore.getToken()).toBe('go-session-token'))
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${goBaseUrl}/api/auth/login`)
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${goBaseUrl}/api/auth/me`)
    expect(screen.queryByRole('button', { name: '游客登录' })).not.toBeInTheDocument()
  })

  it('会话恢复得到 401 时只清理本项目令牌', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonErrorResponse(401, 'UNAUTHORIZED', 'Authentication required'))
    vi.stubGlobal('fetch', fetchMock)
    const sessionStore = new BrowserSessionStore()
    sessionStore.setToken('expired-go-token')
    const authApi = new AuthApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))

    render(
      <AuthProvider authApi={authApi} sessionStore={sessionStore}>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(sessionStore.getToken()).toBeNull())
    expect(fetchMock).toHaveBeenCalledWith(`${goBaseUrl}/api/auth/me`, expect.any(Object))
    expect(screen.getByTestId('session-restore-state')).toHaveTextContent('expired')
    expect(screen.getByTestId('session-restore-error')).toHaveTextContent('')
  })

  it('无令牌时暴露未登录恢复状态', async () => {
    const sessionStore = new BrowserSessionStore()
    const authApi = new AuthApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))

    render(
      <AuthProvider authApi={authApi} sessionStore={sessionStore}>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('session-restore-state')).toHaveTextContent('missing'))
  })

  it('会话恢复遇到 Go 5xx 时保留令牌并暴露失败状态', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonErrorResponse(503, 'SERVICE_UNAVAILABLE', '维护中'))
    vi.stubGlobal('fetch', fetchMock)
    const sessionStore = new BrowserSessionStore()
    sessionStore.setToken('still-valid-go-token')
    const authApi = new AuthApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))

    render(
      <AuthProvider authApi={authApi} sessionStore={sessionStore}>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('session-restore-error')).toHaveTextContent('暂时无法恢复登录状态，请稍后重试。'))
    expect(screen.getByTestId('session-restore-state')).toHaveTextContent('failed')
    expect(sessionStore.getToken()).toBe('still-valid-go-token')
  })

  it('登录后的会话恢复失败会继续向登录页传播错误', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ token: 'new-go-token', user: sampleUser }))
      .mockResolvedValueOnce(jsonErrorResponse(503, 'SERVICE_UNAVAILABLE', '维护中'))
    vi.stubGlobal('fetch', fetchMock)
    const sessionStore = new BrowserSessionStore()
    const authApi = new AuthApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))
    const user = userEvent.setup()

    renderWithRouter(
      <AuthProvider authApi={authApi} sessionStore={sessionStore}>
        <LoginPage />
      </AuthProvider>,
    )
    await user.type(screen.getByLabelText('邮箱'), 'test@example.com')
    await user.type(screen.getByLabelText('密码'), 'password123')
    await user.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('维护中')
    expect(sessionStore.getToken()).toBe('new-go-token')
  })

  it('登录成功后的 /me 返回 401 时拒绝提交并显示错误', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ token: 'new-go-token', user: sampleUser }))
      .mockResolvedValueOnce(jsonErrorResponse(401, 'UNAUTHORIZED', 'Authentication required'))
    vi.stubGlobal('fetch', fetchMock)
    const sessionStore = new BrowserSessionStore()
    const authApi = new AuthApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))
    const user = userEvent.setup()

    renderWithRouter(
      <AuthProvider authApi={authApi} sessionStore={sessionStore}>
        <LoginPage />
      </AuthProvider>,
    )
    await user.type(screen.getByLabelText('邮箱'), 'test@example.com')
    await user.type(screen.getByLabelText('密码'), 'password123')
    await user.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Authentication required')
    expect(sessionStore.getToken()).toBeNull()
  })

  it('注册成功后的 /me 返回 401 时拒绝提交并显示错误', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ token: 'new-go-token', user: sampleUser }))
      .mockResolvedValueOnce(jsonErrorResponse(401, 'UNAUTHORIZED', 'Authentication required'))
    vi.stubGlobal('fetch', fetchMock)
    const sessionStore = new BrowserSessionStore()
    const authApi = new AuthApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))
    const user = userEvent.setup()

    renderWithRouter(
      <AuthProvider authApi={authApi} sessionStore={sessionStore}>
        <RegisterPage />
      </AuthProvider>,
    )
    await user.type(screen.getByLabelText('邮箱'), 'test@example.com')
    await user.type(screen.getByLabelText('密码'), 'password123')
    await user.click(screen.getByRole('button', { name: '注册' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Authentication required')
    expect(sessionStore.getToken()).toBeNull()
  })

  it('旧会话请求晚于新登录返回时不覆盖新会话', async () => {
    const oldMeResponse = deferred<Response>()
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(oldMeResponse.promise)
      .mockResolvedValueOnce(jsonResponse({ token: 'new-go-token', user: newUser }))
      .mockResolvedValueOnce(jsonResponse({ user: newUser }))
    vi.stubGlobal('fetch', fetchMock)
    const sessionStore = new BrowserSessionStore()
    sessionStore.setToken('old-go-token')
    const authApi = new AuthApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))
    const user = userEvent.setup()

    render(
      <AuthProvider authApi={authApi} sessionStore={sessionStore}>
        <AuthStateProbe />
      </AuthProvider>,
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: '触发登录' }))
    await waitFor(() => expect(screen.getByTestId('session-user-id')).toHaveTextContent('user-2'))

    oldMeResponse.resolve(jsonErrorResponse(401, 'UNAUTHORIZED', 'old token expired'))
    await Promise.resolve()
    await Promise.resolve()
    expect(sessionStore.getToken()).toBe('new-go-token')
    expect(screen.getByTestId('session-restore-state')).toHaveTextContent('ready')
    expect(screen.getByTestId('session-user-id')).toHaveTextContent('user-2')
  })

  it('卸载后旧会话请求返回不会清令牌或回写状态', async () => {
    const oldMeResponse = deferred<Response>()
    const fetchMock = vi.fn().mockReturnValue(oldMeResponse.promise)
    vi.stubGlobal('fetch', fetchMock)
    const sessionStore = new BrowserSessionStore()
    sessionStore.setToken('old-go-token')
    const authApi = new AuthApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))

    const view = render(
      <AuthProvider authApi={authApi} sessionStore={sessionStore}>
        <AuthStateProbe />
      </AuthProvider>,
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    view.unmount()
    oldMeResponse.resolve(jsonErrorResponse(401, 'UNAUTHORIZED', 'old token expired'))

    await Promise.resolve()
    await Promise.resolve()
    expect(sessionStore.getToken()).toBe('old-go-token')
  })

  it('StrictMode 清理后的旧恢复完成时不提前结束新恢复的加载态', async () => {
    const firstResponse = deferred<Response>()
    const secondResponse = deferred<Response>()
    const fetchMock = vi.fn().mockReturnValueOnce(firstResponse.promise).mockReturnValueOnce(secondResponse.promise)
    vi.stubGlobal('fetch', fetchMock)
    const sessionStore = new BrowserSessionStore()
    sessionStore.setToken('go-token')
    const authApi = new AuthApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))

    render(
      <StrictMode>
        <AuthProvider authApi={authApi} sessionStore={sessionStore}>
          <AuthStateProbe />
        </AuthProvider>
      </StrictMode>,
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    await act(async () => {
      firstResponse.resolve(jsonResponse({ user: sampleUser }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(screen.getByTestId('session-loading')).toHaveTextContent('true')

    secondResponse.resolve(jsonResponse({ user: sampleUser }))
    await waitFor(() => expect(screen.getByTestId('session-loading')).toHaveTextContent('false'))
  })

  it('登录和注册提交中各自阻止重复请求', async () => {
    const loginResponse = deferred<Response>()
    const registerResponse = deferred<Response>()
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(loginResponse.promise)
      .mockResolvedValueOnce(jsonResponse({ user: sampleUser }))
      .mockReturnValueOnce(registerResponse.promise)
      .mockResolvedValueOnce(jsonResponse({ user: sampleUser }))
    vi.stubGlobal('fetch', fetchMock)
    const sessionStore = new BrowserSessionStore()
    const authApi = new AuthApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))
    const user = userEvent.setup()

    const loginView = renderWithRouter(
      <AuthProvider authApi={authApi} sessionStore={sessionStore}>
        <LoginPage />
      </AuthProvider>,
    )
    await user.type(screen.getByLabelText('邮箱'), 'test@example.com')
    await user.type(screen.getByLabelText('密码'), 'password123')
    await user.click(screen.getByRole('button', { name: '登录' }))
    await user.click(screen.getByRole('button', { name: '登录' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    loginResponse.resolve(jsonResponse({ token: 'login-token', user: sampleUser }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    loginView.unmount()
    sessionStore.clear()

    const registerView = renderWithRouter(
      <AuthProvider authApi={authApi} sessionStore={sessionStore}>
        <RegisterPage />
      </AuthProvider>,
    )
    await user.type(screen.getByLabelText('邮箱'), 'register@example.com')
    await user.type(screen.getByLabelText('密码'), 'password123')
    await user.click(screen.getByRole('button', { name: '注册' }))
    await user.click(screen.getByRole('button', { name: '注册' }))
    expect(fetchMock).toHaveBeenCalledTimes(3)
    registerResponse.resolve(jsonResponse({ token: 'register-token', user: sampleUser }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    registerView.unmount()
  })

  it('畸形 /me 投影使 Provider 进入失败状态并保留令牌', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ user: null })))
    const sessionStore = new BrowserSessionStore()
    sessionStore.setToken('still-valid-go-token')
    const authApi = new AuthApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))

    render(
      <AuthProvider authApi={authApi} sessionStore={sessionStore}>
        <AuthStateProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('session-restore-state')).toHaveTextContent('failed'))
    expect(sessionStore.getToken()).toBe('still-valid-go-token')
  })

  it('真实 Go 会话投影的未知枚举由用户中心降级为状态待确认', async () => {
    const unknownUser = {
      ...sampleUser,
      bindingState: 'binding_pending',
      accountStatus: 'suspended_pending',
      contentAccess: 'future_access',
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ user: unknownUser })))
    const sessionStore = new BrowserSessionStore()
    sessionStore.setToken('go-token')
    const authApi = new AuthApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))

    render(
      <AuthProvider authApi={authApi} sessionStore={sessionStore}>
        <MemoryRouter>
          <AccountPage />
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(await screen.findByRole('heading', { name: '用户中心' })).toBeInTheDocument()
    expect(screen.getAllByText('状态待确认', { exact: false })).toHaveLength(3)
  })

  it('注销只有精确确认后才提交，并清除本项目前端 Go 会话', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ user: sampleUser }))
      .mockResolvedValueOnce(jsonResponse({ deleted: true }))
    vi.stubGlobal('fetch', fetchMock)
    const sessionStore = new BrowserSessionStore()
    sessionStore.setToken('go-session-token')
    const authApi = new AuthApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))
    const user = userEvent.setup()

    render(
      <AuthProvider authApi={authApi} sessionStore={sessionStore}>
        <MemoryRouter>
          <AccountPage />
        </MemoryRouter>
      </AuthProvider>,
    )

    await screen.findByRole('heading', { name: '用户中心' })
    const confirmInput = screen.getByLabelText('确认注销')
    const deleteButton = screen.getByRole('button', { name: '注销账号' })
    expect(deleteButton).toBeDisabled()

    await user.type(confirmInput, '注销')
    expect(deleteButton).toBeEnabled()
    await user.click(deleteButton)

    await waitFor(() => expect(sessionStore.getToken()).toBeNull())
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${goBaseUrl}/api/auth/me`)
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'DELETE' })
    expect(screen.getByRole('alert')).toHaveTextContent('登录已失效，请重新登录')
  })

  it('以精确联合类型锁定 Go 内容访问合同', () => {
    const exactContentAccess: Expect<Equal<ContentAccess, 'standard' | 'review_restricted'>> = true
    const reviewRestrictedContentAccess: ContentAccess = 'review_restricted'

    // @ts-expect-error Go 合同不允许旧 Node 的 SFW 内容访问值。
    const legacyContentAccess: ContentAccess = 'sfw'
    // @ts-expect-error Go 合同不允许旧 Node 的 active 账户状态。
    const legacyAccountStatus: AuthUser['accountStatus'] = 'active'

    void reviewRestrictedContentAccess
    void legacyContentAccess
    void legacyAccountStatus
    expect(exactContentAccess).toBe(true)
  })
})

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
    (<Value>() => Value extends Right ? 1 : 2)
    ? (<Value>() => Value extends Right ? 1 : 2) extends
        (<Value>() => Value extends Left ? 1 : 2)
      ? true
      : false
    : false

type Expect<Condition extends true> = Condition

const sampleUser: AuthUser = {
  id: 'user-1',
  displayName: '测试用户',
  bindingState: 'bound',
  accountStatus: 'normal',
  contentAccess: 'standard',
  timezone: 'Asia/Shanghai',
  isGuest: false,
}

const newUser: AuthUser = {
  ...sampleUser,
  id: 'user-2',
  displayName: '新用户',
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

function jsonErrorResponse(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ success: false, code, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function AuthStateProbe() {
  const { isLoading, login, logout, sessionRestoreError, sessionRestoreState, user } = useAuth()

  return (
    <>
      <output data-testid="session-restore-state">{sessionRestoreState}</output>
      <output data-testid="session-loading">{String(isLoading)}</output>
      <output data-testid="session-restore-error">{sessionRestoreError}</output>
      <output data-testid="session-user-id">{user?.id}</output>
      <button type="button" onClick={() => void login('test@example.com', 'password123')}>触发登录</button>
      <button type="button" onClick={logout}>触发退出</button>
    </>
  )
}

// 认证页面包含路由跳转，测试时使用内存路由模拟真实应用的路由上下文。
function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

function deferred<Value>() {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}
