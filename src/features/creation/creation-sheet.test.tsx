import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, type ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { GoApiClient } from '../../api/http'
import { GoApiProvider } from '../../app/GoApiProvider'
import { TemplateImageEditPage } from './TemplateImageEditPage'
import { VideoCreationPage } from './VideoCreationPage'

const image = new File(['bytes'], 'source.png', { type: 'image/png' })
const cases = [
  { page: <TemplateImageEditPage />, label: '选择模板', file: '上传人物图片', prompt: '补充描述（可选）', kind: 'image' },
  { page: <VideoCreationPage />, label: '选择视频模板', file: '上传首帧图片（可选）', prompt: '首帧描述（可选）', kind: 'video' },
] as const

describe.each(cases)('$kind 详情创作', (fixture) => {
  it('切换模板后不把上次任务结果放入新模板详情', async () => {
    let finish!: () => void
    const statusWait = new Promise<void>((resolve) => { finish = resolve })
    mount(fixture.page, undefined, statusWait)
    await choose(fixture.label)
    fireEvent.change(screen.getByLabelText(fixture.file), { target: { files: [image] } })
    fireEvent.submit(screen.getByRole('button', { name: '开始生成' }).closest('form')!)
    await waitFor(() => expect(screen.getByLabelText(fixture.label)).toBeEnabled())
    await userEvent.setup().click(screen.getByRole('button', { name: '关闭创作' }))
    fireEvent.change(screen.getByLabelText(fixture.label), { target: { value: 'template-2' } })
    await act(async () => finish())
    await within(screen.getByRole('main')).findByText('生成完成')
    expect(within(screen.getByRole('dialog', { name: '另一个模板' })).queryByText('生成完成')).not.toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByText('生成完成')).toBeInTheDocument()
  })
  it('选模板打开完整表单，关闭重开保留文件和描述且不发 POST', async () => {
    const { fetchFn } = mount(fixture.page)
    await choose(fixture.label)
    const dialog = screen.getByRole('dialog', { name: '测试模板' })
    const input = within(dialog).getByLabelText(fixture.file) as HTMLInputElement
    fireEvent.change(input, { target: { files: [image] } })
    fireEvent.change(within(dialog).getByLabelText(fixture.prompt), { target: { value: '保留描述' } })
    await userEvent.setup().click(within(dialog).getByRole('button', { name: '关闭创作' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: '继续编辑' }))
    const reopened = screen.getByRole('dialog')
    expect(within(reopened).getByLabelText(fixture.file)).toBe(input)
    expect(input.files?.[0]).toBe(image)
    expect(within(reopened).getByLabelText(fixture.prompt)).toHaveValue('保留描述')
    expect(fetchFn.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })

  it('弹层提交仍然只上传一次并创建一次，完成态留在弹层', async () => {
    const { fetchFn } = mount(fixture.page)
    await choose(fixture.label)
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(fixture.file), { target: { files: [image] } })
    const form = within(dialog).getByRole('button', { name: '开始生成' }).closest('form')!
    act(() => { fireEvent.submit(form); fireEvent.submit(form) })
    expect(await within(dialog).findByText('生成完成')).toBeInTheDocument()
    expect(fetchFn.mock.calls.filter(([url, init]) => init?.method === 'POST' && url.includes('/media/images'))).toHaveLength(1)
    expect(fetchFn.mock.calls.filter(([url, init]) => init?.method === 'POST' && url.includes('/chat/'))).toHaveLength(1)
    await userEvent.setup().click(within(dialog).getByRole('button', { name: '关闭创作' }))
    expect(screen.getByText('生成完成')).toBeVisible()
  })

  it('上传中关闭与重开不撤销请求也不发第二笔', async () => {
    let finish!: () => void
    const wait = new Promise<void>((resolve) => { finish = resolve })
    const { fetchFn } = mount(fixture.page, wait)
    await choose(fixture.label)
    let dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(fixture.file), { target: { files: [image] } })
    fireEvent.submit(within(dialog).getByRole('button', { name: '开始生成' }).closest('form')!)
    await userEvent.setup().click(within(dialog).getByRole('button', { name: '关闭创作' }))
    await userEvent.setup().click(screen.getByRole('button', { name: '继续编辑' }))
    dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: '开始生成' })).toBeDisabled()
    await act(async () => finish())
    expect(await within(dialog).findByText('生成完成')).toBeInTheDocument()
    expect(fetchFn.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(2)
  })
})

async function choose(label: string) {
  await screen.findByRole('option', { name: '测试模板' })
  fireEvent.change(screen.getByLabelText(label), { target: { value: 'template-1' } })
}

function mount(page: ReactElement, wait?: Promise<void>, statusWait?: Promise<void>) {
  const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/homepage/')) return json({ items: [
      { id: 'template-1', title: '测试模板', type: url.includes('video-templates') ? 'video' : 'image', contentRating: 'sfw' },
      { id: 'template-2', title: '另一个模板', type: url.includes('video-templates') ? 'video' : 'image', contentRating: 'sfw' },
    ], total: 2 })
    if (url.endsWith('/media/images')) {
      await wait
      return json({ id: 'media-1', reference: 'https://local-media.invalid/assets/media-1', contentType: 'image/png', sizeBytes: image.size, downloadUrl: '/api/media/images/media-1' })
    }
    if (init?.method === 'POST') return json({ imageId: 'result-1', taskId: 'result-1', status: 'generating', durationSeconds: 5 })
    await statusWait
    return json({ image: { id: 'result-1', generationStatus: 'completed', imageUrl: '/result.png' }, taskId: 'result-1', status: 'completed', videoUrl: '/result.mp4' })
  })
  const client = new GoApiClient({ baseUrl: 'http://127.0.0.1:18000', sessionStore: { getToken: () => 'test' }, fetchFn: (url, init) => fetchFn(String(url), init) })
  return { ...render(<StrictMode><MemoryRouter><GoApiProvider client={client}>{page}</GoApiProvider></MemoryRouter></StrictMode>), fetchFn }
}

function json(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } })
}
