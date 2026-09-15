import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoApiClient } from './http'
import { type WorkItem, WorksApi } from './works'

const goBaseUrl = 'http://127.0.0.1:18000'
const sessionStore = { getToken: () => 'go-session-token' }

describe('WorksApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('通过 Go 会话读取混合作品首屏，且不向接口传递用户或旧分页字段', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [], nextCursor: null }))
    vi.stubGlobal('fetch', fetchMock)
    const api = new WorksApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))

    await api.list({ limit: 20 })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${goBaseUrl}/api/works?limit=20`)
    expect(init.method).toBe('GET')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer go-session-token')
    expect(url).not.toContain('userId')
    expect(url).not.toContain('skip')
    expect(url).not.toContain('offset')
  })

  it('筛选与续页只传允许的 kind 和 Go 颁发的不透明 cursor', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [], nextCursor: null }))
    vi.stubGlobal('fetch', fetchMock)
    const api = new WorksApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))

    await api.list({ kind: 'video', limit: 20, cursor: 'go-issued-cursor' })

    const url = fetchMock.mock.calls[0]?.[0] as string
    expect(url).toBe(`${goBaseUrl}/api/works?limit=20&kind=video&cursor=go-issued-cursor`)
    expect(url).not.toContain('skip')
    expect(url).not.toContain('offset')
  })

  it('按作品 ID 请求详情，不传 userId 或任何技术和支付字段', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sampleWork()))
    vi.stubGlobal('fetch', fetchMock)
    const api = new WorksApi(new GoApiClient({ baseUrl: goBaseUrl, sessionStore }))

    await api.get('work-1')

    const url = fetchMock.mock.calls[0]?.[0] as string
    expect(url).toBe(`${goBaseUrl}/api/works/work-1`)
    expect(url).not.toContain('userId')
    expect(url).not.toMatch(/model|recipe|task|payment|diamond|balance/i)
  })
})

function sampleWork(): WorkItem {
  return {
    id: 'work-1',
    kind: 'image',
    status: 'succeeded',
    templateId: 'template-1',
    templateVersion: 1,
    createdAt: '2026-09-11T08:30:00Z',
    updatedAt: '2026-09-11T08:31:00Z',
    resultUrl: 'https://cdn.example.com/result.png',
  }
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
