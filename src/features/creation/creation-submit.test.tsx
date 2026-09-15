import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { StrictMode, type ReactElement } from 'react'
import { GoApiClient } from '../../api/http'
import { GoApiProvider } from '../../app/GoApiProvider'
import { ImageCreationPage } from './ImageCreationPage'
import { TemplateImageEditPage } from './TemplateImageEditPage'
import { VideoCreationPage } from './VideoCreationPage'

const image = new File(['image-bytes'], 'source.png', { type: 'image/png' })
const uploaded = {
  id: 'media-1', reference: 'https://local-media.invalid/assets/media-1',
  contentType: 'image/png', sizeBytes: image.size, downloadUrl: '/api/media/images/media-1',
}
const cases = [
  { name: '文生图', page: <ImageCreationPage />, prompt: '提示词' },
  { name: '模板图片编辑', page: <TemplateImageEditPage />, template: '选择模板', file: '上传人物图片' },
  { name: '视频创作', page: <VideoCreationPage />, template: '选择视频模板', file: '上传首帧图片（可选）' },
] as const

describe.each(cases)('$name 提交边界', (fixture) => {
  it('同一轮事件重复提交只创建一个任务', async () => {
    const upload = deferred<Response>()
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes('/homepage/')) return catalog(url)
      if (url.endsWith('/media/images')) return upload.promise
      return new Promise<Response>(() => undefined)
    })
    renderPage(fixture.page, fetchFn)
    await fillForm(fixture)
    const form = screen.getByRole('button', { name: '开始生成' }).closest('form')!
    act(() => { fireEvent.submit(form); fireEvent.submit(form) })
    if ('file' in fixture) {
      expect(fetchFn.mock.calls.filter(([url]) => url.endsWith('/media/images'))).toHaveLength(1)
      await act(async () => upload.resolve(json(uploaded)))
    }
    await waitFor(() => expect(fetchFn.mock.calls.filter(([url]) => url.includes('/api/chat/'))).toHaveLength(1))
  })

  it.each([
    [402, 'INSUFFICIENT_FUNDS', '前往充值'],
    [403, 'ACCOUNT_BINDING_REQUIRED', '请先完成账号绑定'],
    [403, 'VIP_REQUIRED', '该能力需要 VIP 权益'],
    [401, 'UNAUTHORIZED', '登录已失效'],
  ])('保留输入并区分 %s / %s', async (status, code, message) => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes('/homepage/')) return catalog(url)
      if (url.endsWith('/media/images')) return json(uploaded)
      return new Response(JSON.stringify({ success: false, code }), {
        status, headers: { 'Content-Type': 'application/json' },
      })
    })
    renderPage(fixture.page, fetchFn)
    await fillForm(fixture)
    fireEvent.submit(screen.getByRole('button', { name: '开始生成' }).closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    if (status === 402) expect(screen.getByRole('link', { name: '前往充值' })).toHaveAttribute('href', '/wallet')
    if (status === 401) expect(screen.getByRole('link', { name: '重新登录' })).toHaveAttribute('href', '/login')
    if ('prompt' in fixture) expect(screen.getByLabelText(fixture.prompt)).toHaveValue('原有描述')
    if ('file' in fixture) expect((screen.getByLabelText(fixture.file) as HTMLInputElement).files?.[0]).toBe(image)
  })

  it('新提交立即清理旧任务结果', async () => {
    let created = 0
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/homepage/')) return catalog(url)
      if (url.endsWith('/media/images')) return json(uploaded)
      if (init?.method === 'POST') {
        created += 1
        return created === 1
          ? json({ imageId: 'result-1', taskId: 'result-1', status: 'generating', durationSeconds: 5 })
          : new Promise<Response>(() => undefined)
      }
      return json({ image: { id: 'result-1', generationStatus: 'completed' }, taskId: 'result-1', status: 'completed' })
    })
    renderPage(fixture.page, fetchFn)
    await fillForm(fixture)
    const form = screen.getByRole('button', { name: '开始生成' }).closest('form')!
    fireEvent.submit(form)
    await screen.findByText('生成完成')
    fireEvent.submit(form)
    expect(screen.queryByText('生成完成')).not.toBeInTheDocument()
  })

  if ('file' in fixture) {
    it('上传未完成时离开页面，不继续创建任务', async () => {
      const upload = deferred<Response>()
      const fetchFn = vi.fn(async (url: string) => url.includes('/homepage/') ? catalog(url) : upload.promise)
      const view = renderPage(fixture.page, fetchFn)
      await fillForm(fixture)
      fireEvent.submit(screen.getByRole('button', { name: '开始生成' }).closest('form')!)
      view.unmount()
      await act(async () => upload.resolve(json(uploaded)))
      expect(fetchFn.mock.calls.some(([url]) => url.includes('/api/chat/'))).toBe(false)
    })

    it('上传失败保留服务端错误且不创建任务', async () => {
      const fetchFn = vi.fn(async (url: string) => url.includes('/homepage/') ? catalog(url) : new Response(
        JSON.stringify({ success: false, code: 'INVALID_IMAGE', message: '仅支持 JPG、PNG 或 WebP 图片' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ))
      renderPage(fixture.page, fetchFn)
      await fillForm(fixture)
      fireEvent.submit(screen.getByRole('button', { name: '开始生成' }).closest('form')!)
      expect(await screen.findByRole('alert')).toHaveTextContent('仅支持 JPG、PNG 或 WebP 图片')
      expect(fetchFn.mock.calls.some(([url]) => url.includes('/api/chat/'))).toBe(false)
    })
  }
})

function renderPage(page: ReactElement, fetchFn: (url: string, init?: RequestInit) => Promise<Response>) {
  const client = new GoApiClient({ baseUrl: 'http://127.0.0.1:18000', sessionStore: { getToken: () => 'test' }, fetchFn: (url, init) => fetchFn(String(url), init) })
  return render(<StrictMode><MemoryRouter><GoApiProvider client={client}>{page}</GoApiProvider></MemoryRouter></StrictMode>)
}

async function fillForm(fixture: (typeof cases)[number]) {
  const user = userEvent.setup()
  if ('template' in fixture) {
    await screen.findByRole('option', { name: '模板' })
    await user.selectOptions(screen.getByLabelText(fixture.template), 'template-1')
  }
  if ('file' in fixture) fireEvent.change(screen.getByLabelText(fixture.file), { target: { files: [image] } })
  if ('prompt' in fixture) await user.type(screen.getByLabelText(fixture.prompt), '原有描述')
}

function catalog(url: string) {
  return json({ items: [{ id: 'template-1', title: '模板', type: url.includes('video-templates') ? 'video' : 'image', contentRating: 'sfw' }], total: 1 })
}

function json(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } })
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
