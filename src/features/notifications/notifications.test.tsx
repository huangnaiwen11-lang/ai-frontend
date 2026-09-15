import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoApiClient } from '../../api/http'
import { GoApiProvider } from '../../app/GoApiProvider'
import { NotificationsPage } from './NotificationsPage'

const baseUrl = 'http://127.0.0.1:18000'
const sessionStore = { getToken: () => 'go-session-token' }

describe('通知中心', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('支持全部与未读筛选，并仅将筛选条件交给 Go 当前会话接口', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ items: [readItem(), unreadItem()], unreadCount: 1 }))
      .mockResolvedValueOnce(jsonResponse({ items: [unreadItem()], unreadCount: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderPage()
    expect(await screen.findByText('已读通知')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '仅看未读' }))

    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === `${baseUrl}/api/notifications?limit=50&unreadOnly=true`)).toBe(true))
    expect(await screen.findByText('未读通知')).toBeInTheDocument()
    expect(screen.queryByText('已读通知')).not.toBeInTheDocument()
    const unreadCall = fetchMock.mock.calls.find(([url]) => url === `${baseUrl}/api/notifications?limit=50&unreadOnly=true`)
    expect(unreadCall?.[0]).not.toMatch(/userId|node|wallet/i)
  })

  it('清除已读记录后以服务端列表为准刷新，不删除未读通知', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ items: [readItem(), unreadItem()], unreadCount: 1 }))
      .mockResolvedValueOnce(jsonResponse({ deleted: 1 }))
      .mockResolvedValueOnce(jsonResponse({ items: [unreadItem()], unreadCount: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderPage()
    await screen.findByText('已读通知')
    await user.click(screen.getByRole('button', { name: '清除已读' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${baseUrl}/api/notifications`)
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).method).toBe('DELETE')
    expect(screen.queryByText('已读通知')).not.toBeInTheDocument()
    expect(screen.getByText('未读通知')).toBeInTheDocument()
  })

  it('在 Strict Mode 中收到 Go 错误后结束加载并保留可访问错误', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonErrorResponse(401, 'UNAUTHORIZED', '登录已失效，请重新登录'))))

    render(<StrictMode><GoApiProvider client={new GoApiClient({ baseUrl, sessionStore })}><NotificationsPage /></GoApiProvider></StrictMode>)

    expect(await screen.findByRole('alert')).toHaveTextContent('登录已失效，请重新登录')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '暂无通知' })).not.toBeInTheDocument()
  })

  it('读取并保存三项 AI 工作室通知偏好，不携带用户 ID', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ items: [], unreadCount: 0 }))
      .mockResolvedValueOnce(jsonResponse({ pushEnabled: true, emailEnabled: true, generationCompletedEnabled: true }))
      .mockResolvedValueOnce(jsonResponse({ pushEnabled: false, emailEnabled: true, generationCompletedEnabled: true }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderPage()
    await screen.findByRole('heading', { name: '暂无通知' })
    await user.click(screen.getByRole('button', { name: '通知设置' }))
    expect(await screen.findByRole('heading', { name: '通知偏好' })).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: '推送通知' }))
    await user.click(screen.getByRole('button', { name: '保存通知偏好' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    const [url, init] = fetchMock.mock.calls[2] as [string, RequestInit]
    expect(url).toBe(`${baseUrl}/api/notifications/preferences`)
    expect(init.method).toBe('PATCH')
    expect(init.body).toBe(JSON.stringify({ pushEnabled: false, emailEnabled: true, generationCompletedEnabled: true }))
    expect(url).not.toMatch(/userId|node|wallet/i)
  })
})

function renderPage() {
  return render(<GoApiProvider client={new GoApiClient({ baseUrl, sessionStore })}><NotificationsPage /></GoApiProvider>)
}

function readItem() {
  return { id: 'read-1', userId: 'user-1', type: 'system', title: '已读通知', body: '已完成', read: true, readAt: '2026-09-15T01:00:00Z', createdAt: '2026-09-15T01:00:00Z' }
}

function unreadItem() {
  return { id: 'unread-1', userId: 'user-1', type: 'generation', title: '未读通知', body: '正在处理', read: false, readAt: null, createdAt: '2026-09-15T02:00:00Z' }
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } })
}

function jsonErrorResponse(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ success: false, code, message }), { status, headers: { 'Content-Type': 'application/json' } })
}
