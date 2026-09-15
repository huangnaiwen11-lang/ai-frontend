import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoApiClient } from './http'
import { NotificationsApi } from './notifications'

const baseUrl = 'http://127.0.0.1:18000'
const sessionStore = { getToken: () => 'go-session-token' }

describe('NotificationsApi', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('只调用 Go 通知路径并携带会话', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [], unreadCount: 0 }))
    vi.stubGlobal('fetch', fetchMock)
    const api = new NotificationsApi(new GoApiClient({ baseUrl, sessionStore }))

    await api.list(20)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${baseUrl}/api/notifications?limit=20`)
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer go-session-token')
    expect(url).not.toMatch(/userId|node|wallet|diamond/i)
  })

  it('动态通知 ID 只允许单段安全字符，避免拼接任意路径', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'n-1', read: true }))
    vi.stubGlobal('fetch', fetchMock)
    const api = new NotificationsApi(new GoApiClient({ baseUrl, sessionStore }))

    await api.markRead('n-1')
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${baseUrl}/api/notifications/n-1/read`)
    expect(() => api.remove('../other')).toThrow('通知 ID 无效')
  })

  it('清除已读通知只调用无参数的当前用户路径', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ deleted: 2 }))
    vi.stubGlobal('fetch', fetchMock)
    const api = new NotificationsApi(new GoApiClient({ baseUrl, sessionStore }))

    await api.clearRead()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${baseUrl}/api/notifications`)
    expect(init.method).toBe('DELETE')
    expect(url).not.toMatch(/userId|all=|node|wallet/i)
  })

  it('通知偏好只读写 Go 当前会话路径，保存完整三项快照', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ pushEnabled: true, emailEnabled: true, generationCompletedEnabled: true }))
      .mockResolvedValueOnce(jsonResponse({ pushEnabled: false, emailEnabled: true, generationCompletedEnabled: false }))
    vi.stubGlobal('fetch', fetchMock)
    const api = new NotificationsApi(new GoApiClient({ baseUrl, sessionStore }))

    await api.getPreferences()
    await api.savePreferences({ pushEnabled: false, emailEnabled: true, generationCompletedEnabled: false })

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${baseUrl}/api/notifications/preferences`)
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(url).toBe(`${baseUrl}/api/notifications/preferences`)
    expect(init.method).toBe('PATCH')
    expect(init.body).toBe(JSON.stringify({ pushEnabled: false, emailEnabled: true, generationCompletedEnabled: false }))
    expect(url).not.toMatch(/userId|node|wallet|diamond/i)
  })
})

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } })
}
