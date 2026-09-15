import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TemplatePicker } from './TemplatePicker'

const choice = { id: 'template-1', title: '城市漫步', coverUrl: '/cover.jpg' }

describe('模板封面目录', () => {
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
