import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoApiClient } from './http'

const sessionStore = {
  getToken: () => 'go-session-token',
}

describe('GoApiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('为写请求附带 Go 自有会话和请求幂等标识', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { imageId: 'image-1' } }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const client = new GoApiClient({ baseUrl: 'http://127.0.0.1:18000', sessionStore })

    await client.post('/api/chat/image/async', { prompt: 'cat' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://127.0.0.1:18000/api/chat/image/async')
    expect(init.method).toBe('POST')
    expect(init.headers).toBeInstanceOf(Headers)
    const headers = init.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer go-session-token')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('X-Request-Id')).toEqual(expect.any(String))
  })

  it('把 Go 的余额不足保留为 402 业务错误', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false, code: 'INSUFFICIENT_FUNDS', message: '钻石余额不足' }), {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    const client = new GoApiClient({ baseUrl: 'http://127.0.0.1:18000', sessionStore })

    await expect(client.post('/api/chat/image/async', { prompt: 'cat' })).rejects.toMatchObject({
      kind: 'insufficient_balance',
      status: 402,
    })
  })

  it('拒绝绕过受控基地址的绝对 URL', async () => {
    const client = new GoApiClient({ baseUrl: 'http://127.0.0.1:18000', sessionStore })

    await expect(client.post('https://legacy.example.com/api/chat/image/async', {})).rejects.toThrow('只允许调用 /api/ 相对路径')
  })

  it('以浏览器全局上下文调用原生 fetch', async () => {
    const fetchMock = vi.fn(function (this: unknown) {
      if (this !== globalThis) throw new TypeError('非法的 fetch 调用上下文')
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: {} }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)
    const client = new GoApiClient({ baseUrl: 'http://127.0.0.1:18000', sessionStore })

    await expect(client.post('/api/chat/image/async', { prompt: 'cat' })).resolves.toEqual({})
  })

  it('按网络分片解析 SSE 事件并携带 Go Bearer 会话', async () => {
    const chunks = ['event: ready\ndata: {"connected":', 'true}\n\nid: e-1\nevent: change\ndata: {"status":"succeeded"}\n\n']
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk))
        controller.close()
      },
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }))
    const client = new GoApiClient({ baseUrl: 'http://127.0.0.1:18000', sessionStore, fetchFn: fetchMock })
    const events: unknown[] = []
    await client.stream('/api/users/me/generations/stream', (event) => events.push(event))
    expect(events).toEqual([
      { id: undefined, event: 'ready', data: { connected: true } },
      { id: 'e-1', event: 'change', data: { status: 'succeeded' } },
    ])
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe('Bearer go-session-token')
  })

  it('保留非 JSON 的 SSE 数据，不把普通字符串丢弃', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('event: change\ndata: processing\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    }))
    const client = new GoApiClient({ baseUrl: 'http://127.0.0.1:18000', sessionStore, fetchFn: fetchMock })
    const onEvent = vi.fn()

    await client.stream('/api/users/me/generations/stream', onEvent)

    expect(onEvent).toHaveBeenCalledExactlyOnceWith({ id: undefined, event: 'change', data: 'processing' })
  })
})
