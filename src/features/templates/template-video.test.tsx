import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TemplatePicker } from './TemplatePicker'
import { TemplateCreationDialog } from '../creation/TemplateCreationDialog'
import { TemplateMedia } from './TemplateMedia'

const template = { id: 'v1', title: '海边漫步', videoUrl: '/full.mp4', previewVideoUrl: '/small.mp4', coverUrl: '/cover.webp', tag: '旅行' }
const props = { label: '模板', value: '', loading: false, disabled: false, onChange: vi.fn() }
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('模板示例视频', () => {
  it('StrictMode 重建时恢复播放，换源停止旧媒体并播放新媒体', () => {
    const play = vi.mocked(HTMLMediaElement.prototype.play)
    const pause = vi.mocked(HTMLMediaElement.prototype.pause)
    const view = render(<StrictMode><TemplateMedia title="示例" videoUrl="/first.mp4" /></StrictMode>)
    expect(play).toHaveBeenCalledTimes(2)
    expect(pause).toHaveBeenCalledTimes(1)
    const oldMedia = screen.getByLabelText('示例示例视频')
    view.rerender(<StrictMode><TemplateMedia title="示例" videoUrl="/second.mp4" /></StrictMode>)
    expect(screen.getByLabelText('示例示例视频')).not.toBe(oldMedia)
    expect(screen.getByLabelText('示例示例视频')).toHaveAttribute('src', '/second.mp4')
    expect(play).toHaveBeenCalledTimes(4)
    expect(pause).toHaveBeenCalledTimes(3)
  })

  it('浏览器拒绝自动播放时保留原生播放控件，不当成生成错误', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new Error('autoplay blocked'))
    render(<TemplateMedia title="示例" videoUrl="/first.mp4" />)
    await Promise.resolve()
    expect(screen.getByLabelText('示例示例视频')).toHaveAttribute('controls')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('使用真实示例视频，预览不改变模板或触发创建', async () => {
    const onChange = vi.fn()
    const view = render(<TemplatePicker {...props} onChange={onChange} items={[template]} />)
    expect(view.container.querySelector('video')).toBeNull()
    await userEvent.setup().click(screen.getByRole('button', { name: `预览${template.title}` }))
    const video = screen.getByLabelText('海边漫步示例视频')
    expect(video).toHaveAttribute('src', '/full.mp4')
    expect(video).toHaveAttribute('poster', '/cover.webp')
    expect(video).toHaveAttribute('controls')
    expect(video).toHaveAttribute('playsinline')
    expect((video as HTMLVideoElement).muted).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('没有封面但有短预览视频也可打开，关闭后停止播放', async () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    render(<TemplatePicker {...props} items={[{ id: 'v2', title: '旅行', previewVideoUrl: '/small.mp4' }]} />)
    await userEvent.setup().click(screen.getByRole('button', { name: '预览旅行' }))
    expect(screen.getByLabelText('旅行示例视频')).toHaveAttribute('src', '/small.mp4')
    await userEvent.setup().click(screen.getByRole('button', { name: '关闭预览' }))
    expect(screen.queryByLabelText('旅行示例视频')).not.toBeInTheDocument()
    expect(pause).toHaveBeenCalled()
  })

  it('视频失败回到同一模板封面，不发起创建', async () => {
    const onChange = vi.fn()
    render(<TemplatePicker {...props} onChange={onChange} items={[template]} />)
    await userEvent.setup().click(screen.getByRole('button', { name: `预览${template.title}` }))
    fireEvent.error(screen.getByLabelText('海边漫步示例视频'))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('img')).toHaveAttribute('src', template.coverUrl)
    expect(dialog.getByRole('status')).toHaveTextContent('示例视频加载失败')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('关闭创作详情移除示例媒体，但保留单份表单', () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    const properties = { title: template.title, coverUrl: template.coverUrl, videoUrl: template.videoUrl, disabled: false, status: null, onClose: vi.fn(), onSubmit: vi.fn() }
    const view = render(<TemplateCreationDialog {...properties} open><input aria-label="上传" type="file" /></TemplateCreationDialog>)
    const input = screen.getByLabelText('上传')
    expect(screen.getByLabelText('海边漫步示例视频')).toBeInTheDocument()
    view.rerender(<TemplateCreationDialog {...properties} open={false}><input aria-label="上传" type="file" /></TemplateCreationDialog>)
    expect(view.container.ownerDocument.querySelector('video')).toBeNull()
    expect(view.container.ownerDocument.querySelector('input')).toBe(input)
    expect(pause).toHaveBeenCalled()
  })

  it('危险或跨协议资源不能打开预览', () => {
    render(<TemplatePicker {...props} items={[{ id: 'bad', title: '无效资源', coverUrl: '//external.test/x', videoUrl: 'javascript:alert(1)' }]} />)
    expect(screen.getByRole('button', { name: '预览无效资源' })).toBeDisabled()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
