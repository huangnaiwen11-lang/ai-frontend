import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GoApiClient } from '../../api/http'
import { GoApiProvider } from '../../app/GoApiProvider'
import { CheckoutPanel } from './CheckoutPanel'

const products = [
  { id: 'coins_100', version: 1, label: '100 钻石', diamondAmount: 100, amountCents: 299, currency: 'USD' },
  { id: 'coins_300', version: 2, label: '300 钻石', diamondAmount: 300, amountCents: 599, currency: 'USD' },
]
const response = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } })
function renderPanel(fetchFn: typeof fetch) {
  return render(<GoApiProvider client={new GoApiClient({ baseUrl: 'http://localhost:18000', sessionStore: { getToken: () => 'test' }, fetchFn })}><CheckoutPanel /></GoApiProvider>)
}

describe('充值商品选择', () => {
  it('从 Go 加载商品，选中的商品 ID 是唯一建单参数', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(response({ products })).mockResolvedValueOnce(response({ orderId: 'order-1', checkoutUrl: '', credits: 300, integrationMode: 'local_only' }))
    renderPanel(fetchFn)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('radio', { name: /300 钻石/ }))
    await user.click(screen.getByRole('button', { name: '创建充值订单' }))
    expect(JSON.parse(fetchFn.mock.calls[1][1].body)).toEqual({ productId: 'coins_300' })
    expect(await screen.findByText('本地联调收银台')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看订单状态' })).toHaveAttribute('href', '/payment/result?orderId=order-1')
  })
  it('同一批次双击只创建一次，等待期间不切商品', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(response({ products })).mockReturnValueOnce(new Promise(() => {}))
    renderPanel(fetchFn)
    await screen.findByRole('radio', { name: /100 钻石/ })
    const button = screen.getByRole('button', { name: '创建充值订单' })
    act(() => { fireEvent.click(button); fireEvent.click(button) })
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('radio', { name: /300 钻石/ })).toBeDisabled()
  })
  it('没有商品时不回退到写死的测试商品', async () => {
    const fetchFn = vi.fn().mockResolvedValue(response({ products: [] }))
    renderPanel(fetchFn)
    expect(await screen.findByText('暂无可购买的钻石套餐')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '创建充值订单' })).not.toBeInTheDocument()
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
  it('读取失败可以重试，不能按错误数据建单', async () => {
    const fetchFn = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response({ products }))
    renderPanel(fetchFn)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '重试读取商品' }))
    expect(await screen.findByRole('radio', { name: /100 钻石/ })).toBeInTheDocument()
  })
  it('不渲染恶意收银台地址', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(response({ products })).mockResolvedValueOnce(response({ orderId: 'order-1', checkoutUrl: 'javascript:alert(1)', credits: 100, integrationMode: 'paycores' }))
    renderPanel(fetchFn)
    await screen.findByRole('radio', { name: /100 钻石/ })
    await userEvent.click(screen.getByRole('button', { name: '创建充值订单' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /前往.*收银台/ })).not.toBeInTheDocument()
  })
})
