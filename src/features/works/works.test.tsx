import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoApiClient } from '../../api/http'
import type { WorkItem } from '../../api/works'
import { GoApiProvider } from '../../app/GoApiProvider'
import { WorkDetailPage } from './WorkDetailPage'
import { WorksPage } from './WorksPage'

const goBaseUrl = 'http://127.0.0.1:18000'
const sessionStore = { getToken: () => 'go-session-token' }

describe('我的作品列表', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('首屏从 Go 读取图片和视频混合历史，并只展示服务端允许的作品字段', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [sampleImageWork(), sampleVideoWork()],
        nextCursor: null,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderWorksPage()

    expect(await screen.findByRole('heading', { name: '我的作品' })).toBeInTheDocument()
    expect(screen.getByText('图片 · succeeded')).toBeInTheDocument()
    expect(screen.getByText('视频 · succeeded')).toBeInTheDocument()
    expect(screen.getByText('模板：portrait（版本 2）')).toBeInTheDocument()
    expect(screen.getByText('时长：10 秒')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '作品结果预览' })).toHaveAttribute('src', sampleImageWork().resultUrl)
    expect(screen.getAllByRole('link', { name: '查看作品详情' })[0]).toHaveAttribute('href', '/works/work-image-1')

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${goBaseUrl}/api/works?limit=20`)
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer go-session-token')
    expect(url).not.toContain('userId')
    expect(url).not.toMatch(/model|recipe|task|payment|diamond|balance/i)
  })

  it('按图片和视频筛选时重新读取当前 Go 会话下的对应类型作品', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [sampleImageWork()], nextCursor: null }))
      .mockResolvedValueOnce(jsonResponse({ items: [sampleVideoWork()], nextCursor: null }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderWorksPage()
    await screen.findByText('图片 · succeeded')
    await user.click(screen.getByRole('button', { name: '仅看视频' }))

    expect(await screen.findByText('视频 · succeeded')).toBeInTheDocument()
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${goBaseUrl}/api/works?limit=20&kind=video`)
    expect(fetchMock.mock.calls[1]?.[0]).not.toContain('skip=')
  })

  it('加载更多只回传 Go 的 nextCursor，且保留已经加载的作品', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [sampleImageWork()], nextCursor: 'go-issued-cursor' }))
      .mockResolvedValueOnce(jsonResponse({ items: [sampleVideoWork()], nextCursor: null }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderWorksPage()
    await user.click(await screen.findByRole('button', { name: '加载更多作品' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${goBaseUrl}/api/works?limit=20&cursor=go-issued-cursor`)
    expect(fetchMock.mock.calls[1]?.[0]).not.toContain('skip=')
    expect(screen.getByText('图片 · succeeded')).toBeInTheDocument()
    expect(screen.getByText('视频 · succeeded')).toBeInTheDocument()
  })

  it('筛选切换后会丢弃旧续页响应，且继续翻页只使用新筛选的 Go cursor', async () => {
    const pendingOldPage = createDeferred<Response>()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [sampleImageWork()], nextCursor: 'old-go-cursor' }))
      .mockImplementationOnce(() => pendingOldPage.promise)
      .mockResolvedValueOnce(jsonResponse({ items: [sampleVideoWork()], nextCursor: 'new-go-cursor' }))
      .mockResolvedValueOnce(jsonResponse({ items: [], nextCursor: null }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderWorksPage()
    await user.click(await screen.findByRole('button', { name: '加载更多作品' }))
    await user.click(screen.getByRole('button', { name: '仅看视频' }))

    expect(await screen.findByText('视频 · succeeded')).toBeInTheDocument()
    expect(screen.queryByText('图片 · succeeded')).not.toBeInTheDocument()

    pendingOldPage.resolve(jsonResponse({
      items: [{ ...sampleImageWork(), id: 'stale-work', status: 'stale-page' }],
      nextCursor: 'stale-go-cursor',
    }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))

    expect(screen.queryByText('图片 · stale-page')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '加载更多作品' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(fetchMock.mock.calls[3]?.[0]).toBe(`${goBaseUrl}/api/works?limit=20&kind=video&cursor=new-go-cursor`)
  })

  it('组件卸载后会忽略尚未完成的续页响应', async () => {
    const pendingPage = createDeferred<Response>()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [sampleImageWork()], nextCursor: 'go-issued-cursor' }))
      .mockImplementationOnce(() => pendingPage.promise)
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const { unmount } = renderWorksPage()
    await user.click(await screen.findByRole('button', { name: '加载更多作品' }))
    unmount()
    pendingPage.resolve(jsonResponse({ items: [sampleVideoWork()], nextCursor: 'stale-go-cursor' }))

    await Promise.resolve()
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('未完成作品只显示服务端状态，不伪造成功结果或预览', async () => {
    const pendingWork = { ...sampleVideoWork(), status: 'generating', resultUrl: undefined }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [pendingWork], nextCursor: null })))

    renderWorksPage()

    expect(await screen.findByText('视频 · generating')).toBeInTheDocument()
    expect(screen.queryByLabelText('作品结果预览')).not.toBeInTheDocument()
    expect(screen.queryByText('查看结果')).not.toBeInTheDocument()
  })

  it('空列表、未认证和通用失败均提供可访问的明确状态', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [], nextCursor: null }))
      .mockResolvedValueOnce(jsonErrorResponse(401, 'UNAUTHORIZED', '登录已失效，请重新登录'))
      .mockResolvedValueOnce(jsonErrorResponse(503, 'UPSTREAM_UNAVAILABLE', '服务暂不可用'))
    vi.stubGlobal('fetch', fetchMock)

    const { rerender } = renderWorksPage()
    expect(await screen.findByText('暂无作品记录')).toBeInTheDocument()

    rerender(renderWorksPageElement())
    expect(await screen.findByRole('alert')).toHaveTextContent('登录已失效，请重新登录')

    rerender(renderWorksPageElement())
    expect(await screen.findByRole('alert')).toHaveTextContent('服务暂不可用')
  })
})

describe('作品详情', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('跨用户或不存在的作品返回 404 时显示“作品不存在或无权查看”', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonErrorResponse(404, 'WORK_NOT_FOUND', '作品不存在或无权查看')))

    renderWorkDetailPage('/works/foreign-work')

    expect(await screen.findByRole('alert')).toHaveTextContent('作品不存在或无权查看')
  })

  it('Go 返回 401 时以可访问错误提示登录已失效，不展示作品详情数据', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonErrorResponse(401, 'UNAUTHORIZED', '登录已失效，请重新登录')))

    renderWorkDetailPage('/works/work-1')

    expect(await screen.findByRole('alert')).toHaveTextContent('登录已失效，请重新登录')
    expect(screen.queryByLabelText('作品详情内容')).not.toBeInTheDocument()
  })
})

function renderWorksPage() {
  return render(renderWorksPageElement())
}

function renderWorksPageElement() {
  return (
    <GoApiProvider client={new GoApiClient({ baseUrl: goBaseUrl, sessionStore })}>
      <MemoryRouter>
        <WorksPage />
      </MemoryRouter>
    </GoApiProvider>
  )
}

function renderWorkDetailPage(initialEntry: string) {
  return render(
    <GoApiProvider client={new GoApiClient({ baseUrl: goBaseUrl, sessionStore })}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/works/:workId" element={<WorkDetailPage />} />
        </Routes>
      </MemoryRouter>
    </GoApiProvider>,
  )
}

function sampleImageWork(): WorkItem {
  return {
    id: 'work-image-1',
    kind: 'image' as const,
    status: 'succeeded',
    templateId: 'portrait',
    templateVersion: 2,
    createdAt: '2026-09-11T08:30:00Z',
    updatedAt: '2026-09-11T08:31:00Z',
    resultUrl: 'https://cdn.example.com/result.png',
  }
}

function sampleVideoWork(): WorkItem {
  return {
    id: 'work-video-1',
    kind: 'video' as const,
    status: 'succeeded',
    durationSeconds: 10,
    createdAt: '2026-09-11T08:20:00Z',
    updatedAt: '2026-09-11T08:21:00Z',
    resultUrl: 'https://cdn.example.com/result.mp4',
  }
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

/** 仅用于控制网络响应先后顺序，验证 UI 不会采用已失效筛选条件下的旧数据。 */
function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}
