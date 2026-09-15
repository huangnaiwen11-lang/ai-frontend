import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoApiClient } from '../../api/http'
import { GoApiProvider } from '../../app/GoApiProvider'
import { ROUTES } from '../../app/routes'
import { ImageCreationPage } from './ImageCreationPage'
import { TemplateImageEditPage } from './TemplateImageEditPage'
import { VideoCreationPage } from './VideoCreationPage'

const goBaseUrl = 'http://127.0.0.1:18000'
const sessionStore = { getToken: () => 'go-session-token' }

describe('创作页面', () => {
  it.each([
    ['image', TemplateImageEditPage, '选择模板'],
    ['video', VideoCreationPage, '选择视频模板'],
  ] as const)('%s 模板封面可选择，选择本身不创建任务', async (kind, Page, label) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [{ id: 'template-1', title: '城市漫步', type: kind, contentRating: 'sfw', coverUrl: '/cling-ai-icon.png' }], total: 1 }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<GoApiProvider client={new GoApiClient({ baseUrl: goBaseUrl, sessionStore })}><Page /></GoApiProvider>)
    expect(await screen.findByRole('img', { name: '城市漫步' })).toHaveAttribute('src', '/legacy/cling-ai-icon.png')
    await user.click(screen.getByRole('radio', { name: '城市漫步' }))
    expect(screen.getByLabelText(label)).toHaveValue('template-1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('即使没有本地余额信息也提交图片创建，并只由 Go 返回 402', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ imageId: 'image-1', status: 'generating' }))
      .mockResolvedValueOnce(
        jsonResponse({
          image: { id: 'image-1', imageUrl: 'https://cdn.example.com/image-1.png', generationStatus: 'completed' },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderImagePage()
    await user.type(screen.getByLabelText('提示词'), '一只橘猫')
    await user.click(screen.getByRole('button', { name: '开始生成' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${goBaseUrl}/api/chat/image/async`)
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(requestInit.body as string)).toEqual(
      expect.objectContaining({ prompt: '一只橘猫', operation: 'generate' }),
    )
    expect(requestInit.body).not.toContain('balance')
    expect(requestInit.body).not.toContain('diamond')
    expect(screen.getByText('生成完成')).toBeInTheDocument()
  })

  it('Go 返回 402 时保留输入并提供充值入口', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonErrorResponse(402, 'INSUFFICIENT_FUNDS', '钻石余额不足')))
    const user = userEvent.setup()

    renderImagePage()
    await user.type(screen.getByLabelText('提示词'), '保留的提示词')
    await user.click(screen.getByRole('button', { name: '开始生成' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('钻石余额不足')
    expect(screen.getByLabelText('提示词')).toHaveValue('保留的提示词')
    expect(screen.getByRole('link', { name: '前往充值' })).toHaveAttribute('href', ROUTES.wallet)
  })

  it('首次完成后再次提交时立即清理旧结果，并保留新的提示词', async () => {
    const secondCreateRequest = new Promise<Response>(() => undefined)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ imageId: 'image-first', status: 'generating' }))
      .mockResolvedValueOnce(
        jsonResponse({
          image: {
            id: 'image-first',
            imageUrl: 'https://cdn.example.com/image-first.png',
            generationStatus: 'completed',
          },
        }),
      )
      .mockReturnValueOnce(secondCreateRequest)
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderImagePage()
    const promptInput = screen.getByLabelText('提示词')
    await user.type(promptInput, '第一次提示词')
    await user.click(screen.getByRole('button', { name: '开始生成' }))
    await screen.findByText('生成完成')

    await user.clear(promptInput)
    await user.type(promptInput, '第二次提示词')
    await user.click(screen.getByRole('button', { name: '开始生成' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(screen.getByLabelText('提示词')).toHaveValue('第二次提示词')
    expect(screen.queryByText('生成完成')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '生成结果' })).not.toBeInTheDocument()
  })

  it('视频模板页只使用 Go 目录和 Go 素材创建 I2V 请求', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: 'video-safe', title: '安全视频模板', type: 'video', contentRating: 'sfw' }], total: 1 }))
      .mockResolvedValueOnce(jsonResponse({ id: 'media-1', reference: 'https://local-media.invalid/assets/media-1', contentType: 'image/png', sizeBytes: 67, downloadUrl: '/api/media/images/media-1' }))
      .mockResolvedValueOnce(jsonResponse({ taskId: 'video-1', status: 'generating', durationSeconds: 5 }))
      .mockResolvedValueOnce(jsonResponse({ taskId: 'video-1', status: 'generating', durationSeconds: 5 }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(
      <GoApiProvider client={new GoApiClient({ baseUrl: goBaseUrl, sessionStore })}>
        <VideoCreationPage />
      </GoApiProvider>,
    )
    const templateSelect = await screen.findByLabelText('选择视频模板')
    await waitFor(() => expect(templateSelect).toBeEnabled())
    await user.selectOptions(templateSelect, 'video-safe')
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'source.png', { type: 'image/png' })
    const input = screen.getByLabelText('上传首帧图片（可选）') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.submit(screen.getByRole('button', { name: '开始生成' }).closest('form')!)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${goBaseUrl}/api/homepage/video-templates`)
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${goBaseUrl}/api/media/images`)
    const createInit = fetchMock.mock.calls[2]?.[1] as RequestInit
    expect(JSON.parse(createInit.body as string)).toEqual(expect.objectContaining({ templateId: 'video-safe', imageUrl: 'https://local-media.invalid/assets/media-1', durationSeconds: 5 }))
  })

  it('视频模板可提交文本首帧请求，由 Go 编排后续 I2V', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: 'video-safe', title: '安全视频模板', type: 'video', contentRating: 'sfw' }], total: 1 }))
      .mockResolvedValueOnce(jsonResponse({ taskId: 'video-text-1', status: 'generating', durationSeconds: 5 }))
      .mockResolvedValueOnce(jsonResponse({ taskId: 'video-text-1', status: 'generating', durationSeconds: 5 }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<GoApiProvider client={new GoApiClient({ baseUrl: goBaseUrl, sessionStore })}><VideoCreationPage /></GoApiProvider>)
    const templateSelect = await screen.findByLabelText('选择视频模板')
    await waitFor(() => expect(templateSelect).toBeEnabled())
    await user.selectOptions(templateSelect, 'video-safe')
    await user.type(screen.getByLabelText('首帧描述（可选）'), '海边漫步')
    fireEvent.submit(screen.getByRole('button', { name: '开始生成' }).closest('form')!)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    const createInit = fetchMock.mock.calls[1]?.[1] as RequestInit
    expect(JSON.parse(createInit.body as string)).toEqual(expect.objectContaining({ templateId: 'video-safe', prompt: '海边漫步', durationSeconds: 5 }))
  })

  it('视频页允许选择 5、10、15 秒并把选择交给 Go', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: 'video-safe', title: '安全视频模板', type: 'video', contentRating: 'sfw' }], total: 1 }))
      .mockResolvedValueOnce(jsonResponse({ taskId: 'video-15', status: 'generating', durationSeconds: 15 }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<GoApiProvider client={new GoApiClient({ baseUrl: goBaseUrl, sessionStore })}><VideoCreationPage /></GoApiProvider>)
    await user.selectOptions(await screen.findByLabelText('选择视频模板'), 'video-safe')
    await user.selectOptions(screen.getByLabelText('视频时长'), '15')
    await user.type(screen.getByLabelText('首帧描述（可选）'), '城市夜景')
    fireEvent.submit(screen.getByRole('button', { name: '开始生成' }).closest('form')!)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const body = JSON.parse((fetchMock.mock.calls[1]?.[1] as RequestInit).body as string)
    expect(body.durationSeconds).toBe(15)
  })

  it('视频页区分余额不足与两类 403 门禁', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: 'video-safe', title: '安全视频模板', type: 'video', contentRating: 'sfw' }], total: 1 }))
      .mockResolvedValueOnce(jsonErrorResponse(403, 'ACCOUNT_BINDING_REQUIRED', '请先绑定账号'))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<GoApiProvider client={new GoApiClient({ baseUrl: goBaseUrl, sessionStore })}><VideoCreationPage /></GoApiProvider>)
    await user.selectOptions(await screen.findByLabelText('选择视频模板'), 'video-safe')
    await user.type(screen.getByLabelText('首帧描述（可选）'), '测试')
    fireEvent.submit(screen.getByRole('button', { name: '开始生成' }).closest('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('请先完成账号绑定')
  })

  it('模板编辑只使用 Go 目录、Go 上传素材和服务端返回的素材引用', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        items: [{ id: 'local-image-edit-dress-up', title: '本地换装测试模板', coverUrl: '/cover.png', type: 'image', contentRating: 'sfw' }],
        total: 1,
      }))
      .mockResolvedValueOnce(jsonResponse({
        id: 'media-1', reference: 'https://local-media.invalid/assets/media-1', contentType: 'image/png', sizeBytes: 67, downloadUrl: '/api/media/images/media-1',
      }))
      .mockResolvedValueOnce(jsonResponse({ imageId: 'image-edit-1', status: 'generating' }))
      .mockResolvedValueOnce(jsonResponse({ image: { id: 'image-edit-1', generationStatus: 'generating' } }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(
      <GoApiProvider client={new GoApiClient({ baseUrl: goBaseUrl, sessionStore })}>
        <TemplateImageEditPage />
      </GoApiProvider>,
    )
    const templateSelect = await screen.findByLabelText('选择模板')
    await waitFor(() => expect(templateSelect).toBeEnabled())
    await user.selectOptions(templateSelect, 'local-image-edit-dress-up')
		expect(templateSelect).toHaveValue('local-image-edit-dress-up')
    const image = new File([new Uint8Array([137, 80, 78, 71])], 'portrait.png', { type: 'image/png' })
    const imageInput = screen.getByLabelText('上传人物图片') as HTMLInputElement
    fireEvent.change(imageInput, { target: { files: [image] } })
		expect(imageInput.files).toHaveLength(1)
    fireEvent.submit(screen.getByRole('button', { name: '开始生成' }).closest('form')!)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${goBaseUrl}/api/homepage/image-templates`)
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${goBaseUrl}/api/media/images`)
    const uploadInit = fetchMock.mock.calls[1]?.[1] as RequestInit
    expect(uploadInit.body).toBeInstanceOf(FormData)
    const createInit = fetchMock.mock.calls[2]?.[1] as RequestInit
    expect(JSON.parse(createInit.body as string)).toEqual(expect.objectContaining({
      templateId: 'local-image-edit-dress-up', inputImages: ['https://local-media.invalid/assets/media-1'], operation: 'generate',
    }))
    expect(createInit.body).not.toContain('balance')
    expect(createInit.body).not.toContain('diamond')
  })
})

function renderImagePage() {
  return render(
    <MemoryRouter>
      <GoApiProvider client={new GoApiClient({ baseUrl: goBaseUrl, sessionStore })}>
        <ImageCreationPage />
      </GoApiProvider>
    </MemoryRouter>,
  )
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
