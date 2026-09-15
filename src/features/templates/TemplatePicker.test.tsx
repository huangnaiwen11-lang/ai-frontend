import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TemplatePicker } from './TemplatePicker'

const choice = { id: 'template-1', title: '城市漫步', coverUrl: '/cover.jpg' }

// jsdom 不实现原生模态方法；键盘焦点约束在真实浏览器另行验收。
const dialogMethods = ['showModal', 'close'] as const
const originalDialogMethods = dialogMethods.map((name) => Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name))
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
})
afterEach(() => {
  cleanup()
  dialogMethods.forEach((name, index) => {
    const original = originalDialogMethods[index]
    if (original) Object.defineProperty(HTMLDialogElement.prototype, name, original)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
  })
  document.body.style.overflow = ''
})

describe('模板封面目录', () => {
  it('再次点击当前模板仍通知页面打开详情一次', async () => {
    const onChange = vi.fn()
    render(<TemplatePicker label="模板" items={[choice]} value={choice.id} loading={false} disabled={false} onChange={onChange} />)
    await userEvent.setup().click(screen.getByRole('radio', { name: choice.title }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(choice.id)
  })
  it('打开预览不切换模板，确认使用才通知一次', async () => {
    const onChange = vi.fn()
    render(<TemplatePicker label="模板" items={[choice]} value="" loading={false} disabled={false} onChange={onChange} />)
    await userEvent.setup().click(screen.getByRole('button', { name: '预览城市漫步' }))
    const dialog = screen.getByRole('dialog', { name: choice.title })
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', choice.coverUrl)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('radio', { name: choice.title })).not.toBeChecked()
    await userEvent.setup().click(within(dialog).getByRole('button', { name: '使用模板' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(choice.id)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each(['按钮', 'Esc', '遮罩'])('%s 关闭不改变选择，恢复原滚动状态与焦点', async (method) => {
    document.body.style.overflow = 'auto'
    const onChange = vi.fn()
    render(<TemplatePicker label="模板" items={[choice]} value="" loading={false} disabled={false} onChange={onChange} />)
    const trigger = screen.getByRole('button', { name: '预览城市漫步' })
    await userEvent.setup().click(trigger)
    const dialog = screen.getByRole('dialog')
    expect(document.body.style.overflow).toBe('hidden')
    if (method === '按钮') await userEvent.setup().click(within(dialog).getByRole('button', { name: '关闭预览' }))
    if (method === 'Esc') fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))
    if (method === '遮罩') { fireEvent.pointerDown(dialog); fireEvent.click(dialog) }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('auto')
    expect(trigger).toHaveFocus()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('预览加载失败不替换其它图片，重开可以重新加载', async () => {
    render(<TemplatePicker label="模板" items={[choice]} value="" loading={false} disabled={false} onChange={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('button', { name: '预览城市漫步' }))
    fireEvent.error(within(screen.getByRole('dialog')).getByRole('img'))
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('预览图片加载失败')
    expect(within(screen.getByRole('dialog')).queryByRole('img')).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: '关闭预览' }))
    await userEvent.setup().click(screen.getByRole('button', { name: '预览城市漫步' }))
    expect(within(screen.getByRole('dialog')).getByRole('img')).toHaveAttribute('src', choice.coverUrl)
  })

  it('目录不再包含模板时关闭预览，重新出现也不自动打开', async () => {
    const props = { label: '模板', value: '', loading: false, disabled: false, onChange: vi.fn() }
    const view = render(<TemplatePicker {...props} items={[choice]} />)
    await userEvent.setup().click(screen.getByRole('button', { name: '预览城市漫步' }))
    view.rerender(<TemplatePicker {...props} items={[]} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
    view.rerender(<TemplatePicker {...props} items={[choice]} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('缺少封面不可打开预览，已有封面在提交期间也禁用', () => {
    const props = { label: '模板', items: [choice, { id: 'missing', title: '缺图模板' }], value: '', loading: false, onChange: vi.fn() }
    const view = render(<TemplatePicker {...props} disabled={false} />)
    expect(screen.getByRole('button', { name: '预览城市漫步' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '预览缺图模板' })).toBeDisabled()
    view.rerender(<TemplatePicker {...props} disabled />)
    expect(screen.getByRole('button', { name: '预览城市漫步' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '预览缺图模板' })).toBeDisabled()
  })

  it('列表与弹层对同一迁移封面使用相同地址', async () => {
    render(<TemplatePicker label="模板" items={[{ ...choice, coverUrl: '/cling-ai-icon.png' }]} value="" loading={false} disabled={false} onChange={vi.fn()} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', '/legacy/cling-ai-icon.png')
    await userEvent.setup().click(screen.getByRole('button', { name: '预览城市漫步' }))
    expect(within(screen.getByRole('dialog')).getByRole('img')).toHaveAttribute('src', '/legacy/cling-ai-icon.png')
  })

  it('目录加载或权限请求失败时撤下已经展示的弹层', async () => {
    const props = { label: '模板', items: [choice], value: '', loading: false, disabled: false, onChange: vi.fn() }
    const view = render(<TemplatePicker {...props} />)
    await userEvent.setup().click(screen.getByRole('button', { name: '预览城市漫步' }))
    view.rerender(<TemplatePicker {...props} failed />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('缺失或加载失败的封面不替换成其它模板图片', () => {
    render(<TemplatePicker label="模板" items={[choice, { id: 'missing', title: '缺图模板' }]}
      value="" loading={false} disabled={false} onChange={vi.fn()} />)
    fireEvent.error(screen.getByRole('img', { name: '城市漫步' }))
    expect(screen.getAllByText('暂无封面')).toHaveLength(2)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('提交期间不可切换模板', async () => {
    const onChange = vi.fn()
    render(<TemplatePicker label="模板" items={[choice]} value="" loading={false} disabled onChange={onChange} />)
    await userEvent.setup().click(screen.getByRole('radio', { name: choice.title }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('正常空目录与请求失败不显示相同状态', () => {
    const view = render(<TemplatePicker label="模板" items={[]} value="" loading={false} disabled={false} onChange={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('暂无可用模板')
    view.rerender(<TemplatePicker label="模板" items={[]} value="" loading={false} disabled={false} failed onChange={vi.fn()} />)
    expect(screen.queryByText('暂无可用模板')).not.toBeInTheDocument()
  })
})
