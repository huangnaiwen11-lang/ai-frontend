import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode, type ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GoApiClient } from '../../api/http'
import { GoApiProvider } from '../../app/GoApiProvider'
import { TemplateImageEditPage } from './TemplateImageEditPage'
import { VideoCreationPage } from './VideoCreationPage'
import { CreationResult } from './CreationResult'

const file = new File(['local-image'], 'source.png', { type: 'image/png' })
const fixtures = [
  { page: <TemplateImageEditPage />, label: '上传人物图片', template: '选择模板', kind: 'image' },
  { page: <VideoCreationPage />, label: '上传首帧图片（可选）', template: '选择视频模板', kind: 'video' },
] as const

beforeEach(() => {
  let sequence = 0
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => `blob:preview-${++sequence}`)
    static revokeObjectURL = vi.fn()
  })
})
afterEach(() => vi.unstubAllGlobals())

describe.each(fixtures)('$kind 素材展示', (fixture) => {
  it('选图只在本地预览，移除后可以再次选择同一文件，卸载释放地址', async () => {
    const { fetchFn, unmount } = mount(fixture.page)
    await screen.findByRole('option', { name: '模板' })
    fireEvent.change(screen.getByLabelText(fixture.template), { target: { value: 'template-1' } })
    const input = screen.getByLabelText(fixture.label)
    fireEvent.change(input, { target: { files: [file] } })
    const firstURL = screen.getByAltText('已选图片预览').getAttribute('src')
    expect(firstURL).toMatch(/^blob:/)
    expect(fetchFn.mock.calls.every(([, init]) => !init?.method || init.method === 'GET')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '移除图片' }))
    expect(screen.queryByAltText('已选图片预览')).not.toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(firstURL)
    fireEvent.change(input, { target: { files: [file] } })
    const lastURL = screen.getByAltText('已选图片预览').getAttribute('src')
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(lastURL)
  })

  it('生成完成展示对应媒体，加载失败不重建任务', async () => {
    const { fetchFn } = mount(fixture.page)
    await selectInput(fixture)
    fireEvent.submit(screen.getByRole('button', { name: '开始生成' }).closest('form')!)
    await screen.findByText('生成完成')
    const media = fixture.kind === 'image' ? screen.getByAltText('生成结果') : screen.getByLabelText('生成视频')
    expect(media).toHaveAttribute('src', `/test-result.${fixture.kind === 'image' ? 'png' : 'mp4'}`)
    if (fixture.kind === 'video') {
      expect(media).toHaveAttribute('controls')
      expect(media).toHaveAttribute('playsinline')
      expect(media).not.toHaveAttribute('autoplay')
    }
    fireEvent.error(media)
    expect(await screen.findByRole('alert')).toHaveTextContent('作品加载失败')
    expect(screen.getByText('生成完成')).toBeInTheDocument()
    expect(fetchFn.mock.calls.filter(([url, init]) => url.includes('/chat/') && init?.method === 'POST')).toHaveLength(1)
  })

  it('审核没收只展示不退还提示，即使响应带媒体地址也不展示', async () => {
    mount(fixture.page, 'moderated')
    await selectInput(fixture)
    fireEvent.submit(screen.getByRole('button', { name: '开始生成' }).closest('form')!)
    expect(await screen.findByRole('status')).toHaveTextContent('内容审核未通过，钻石不予退还。')
    expect(screen.queryByAltText('生成结果')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('生成视频')).not.toBeInTheDocument()
  })

  it('提交期间不能移除已冻结的输入图片', async () => {
    mount(fixture.page, 'pending-upload')
    await selectInput(fixture)
    fireEvent.submit(screen.getByRole('button', { name: '开始生成' }).closest('form')!)
    expect(screen.getByRole('button', { name: '移除图片' })).toBeDisabled()
  })

  it('直接替换选图释放旧地址且不会上传', async () => {
    const { fetchFn } = mount(fixture.page)
    await selectInput(fixture)
    const previousURL = screen.getByAltText('已选图片预览').getAttribute('src')
    const replacement = new File(['replacement'], 'replacement.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText(fixture.label), { target: { files: [replacement] } })
    expect(screen.getByAltText('已选图片预览').getAttribute('src')).not.toBe(previousURL)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(previousURL)
    expect(fetchFn.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })
})

it('完成但没有媒体地址时保留终态，不制造空图片或链接', () => {
  render(<CreationResult kind="image" />)
  expect(screen.getByRole('status')).toHaveTextContent('生成完成')
  expect(screen.getByText('作品地址暂未返回，请稍后在作品中查看。')).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

it('更换结果地址后清除旧媒体的加载失败状态', () => {
  const view = render(<CreationResult kind="image" url="/first.png" />)
  fireEvent.error(screen.getByAltText('生成结果'))
  expect(screen.getByRole('alert')).toHaveTextContent('作品加载失败')
  view.rerender(<CreationResult kind="image" url="/second.png" />)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByAltText('生成结果')).toHaveAttribute('src', '/second.png')
})

it('视频移除首帧后按描述提交，不上传图片', async () => {
  const { fetchFn } = mount(<VideoCreationPage />)
  await selectInput(fixtures[1])
  fireEvent.click(screen.getByRole('button', { name: '移除图片' }))
  fireEvent.change(screen.getByLabelText('首帧描述（可选）'), { target: { value: '首帧描述' } })
  fireEvent.submit(screen.getByRole('button', { name: '开始生成' }).closest('form')!)
  await waitFor(() => expect(fetchFn.mock.calls.some(([url]) => url.includes('/chat/'))).toBe(true))
  expect(fetchFn.mock.calls.some(([url]) => url.endsWith('/media/images'))).toBe(false)
  const request = fetchFn.mock.calls.find(([, init]) => init?.method === 'POST')!
  expect(JSON.parse(String(request[1]?.body))).toMatchObject({ prompt: '首帧描述' })
  expect(JSON.parse(String(request[1]?.body))).not.toHaveProperty('imageUrl')
})

async function selectInput(fixture: (typeof fixtures)[number]) {
  await screen.findByRole('option', { name: '模板' })
  fireEvent.change(screen.getByLabelText(fixture.template), { target: { value: 'template-1' } })
  fireEvent.change(screen.getByLabelText(fixture.label), { target: { files: [file] } })
}

function mount(page: ReactElement, status = 'completed') {
  const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/homepage/')) return json({ items: [{ id: 'template-1', title: '模板', type: url.includes('video-templates') ? 'video' : 'image', contentRating: 'sfw' }], total: 1 })
    if (url.endsWith('/media/images')) {
      if (status === 'pending-upload') return new Promise<Response>(() => undefined)
      return json({ id: 'media-1', reference: 'https://local-media.invalid/assets/media-1', contentType: 'image/png', sizeBytes: file.size, downloadUrl: '/api/media/images/media-1' })
    }
    if (init?.method === 'POST') return json({ imageId: 'result-1', taskId: 'result-1', status: 'generating', durationSeconds: 5 })
    return json({ image: { id: 'result-1', generationStatus: status, imageUrl: '/test-result.png' }, taskId: 'result-1', status, videoUrl: '/test-result.mp4' })
  })
  const client = new GoApiClient({ baseUrl: 'http://127.0.0.1:18000', sessionStore: { getToken: () => 'test' }, fetchFn: (url, init) => fetchFn(String(url), init) })
  return { ...render(<StrictMode><MemoryRouter><GoApiProvider client={client}>{page}</GoApiProvider></MemoryRouter></StrictMode>), fetchFn }
}

function json(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } })
}
