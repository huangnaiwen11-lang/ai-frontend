import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoApiClient } from '../../api/http'
import { GoApiProvider } from '../../app/GoApiProvider'
import { PaymentResultPage } from './PaymentResultPage'

const order = { orderId: 'order-1', productId: 'coins_100', status: 'pending', provider: 'paycores', amountCents: 299, currency: 'USD', credits: 100, paymentReceived: false, backendReady: false }
const response = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } })
function renderPage(fetchFn: typeof fetch, search = '?orderId=order-1') {
  return render(<MemoryRouter initialEntries={['/payment/result' + search]}><GoApiProvider client={new GoApiClient({ baseUrl: 'http://localhost:18000', sessionStore: { getToken: () => 'test' }, fetchFn })}><PaymentResultPage /></GoApiProvider></MemoryRouter>)
}

describe('支付结果只认 Go 入账事实', () => {
  afterEach(() => vi.useRealTimers())
  it('网址伪造成功不会被当作支付完成，刷新只查订单', async () => {
    const fetchFn = vi.fn().mockImplementation(async () => response(order))
    renderPage(fetchFn, '?orderId=order-1&status=success&paid=true')
    expect(await screen.findByText('等待付款确认')).toBeInTheDocument()
    expect(screen.queryByText('支付成功，钻石已到账')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '刷新订单状态' }))
    expect(fetchFn.mock.calls.every((call) => call[1].method === 'GET')).toBe(true)
    expect(fetchFn.mock.calls.every((call) => call[0].endsWith('/order-status/order-1'))).toBe(true)
  })
  it('只有 Go 确认 paid 才显示到账，并停止轮询', async () => {
    vi.useFakeTimers()
    const fetchFn = vi.fn().mockImplementation(async () => response({ ...order, status: 'paid', paymentReceived: true, backendReady: true }))
    renderPage(fetchFn)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByText('支付成功，钻石已到账')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
  it('待支付自动查询，页面卸载后停止', async () => {
    vi.useFakeTimers()
    const fetchFn = vi.fn().mockImplementation(async () => response(order))
    const view = renderPage(fetchFn)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(fetchFn).toHaveBeenCalledTimes(2)
    view.unmount()
    await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
  it('请求未返回时卸载，不接受迟到结果或重启轮询', async () => {
    vi.useFakeTimers()
    let finish!: (value: Response) => void
    const fetchFn = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const view = renderPage(fetchFn)
    view.unmount()
    await act(async () => { finish(response(order)); await vi.advanceTimersByTimeAsync(60000) })
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('等待付款确认')).not.toBeInTheDocument()
  })
  it('缺少或重复订单编号时不发请求', async () => {
    const fetchFn = vi.fn()
    renderPage(fetchFn, '?orderId=order-1&orderId=order-2')
    expect(screen.getByRole('alert')).toHaveTextContent('订单编号无效')
    expect(fetchFn).not.toHaveBeenCalled()
  })
  it('查不到订单显示错误，不假定失败退款或成功到账', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, code: 'NOT_FOUND', message: '订单不存在' }), { status: 404, headers: { 'Content-Type': 'application/json' } }))
    renderPage(fetchFn)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('订单不存在'))
    expect(screen.queryByText('支付成功，钻石已到账')).not.toBeInTheDocument()
  })
  it('达到 60 次自动查询后暂停，手动刷新可继续', async () => {
    vi.useFakeTimers()
    const fetchFn = vi.fn().mockImplementation(async () => response(order))
    renderPage(fetchFn)
    await act(async () => { await vi.advanceTimersByTimeAsync(400000) })
    expect(fetchFn).toHaveBeenCalledTimes(60)
    expect(screen.getByText('暂未收到付款确认，请稍后刷新。')).toBeInTheDocument()
    await act(async () => { screen.getByRole('button', { name: '刷新订单状态' }).click(); await vi.advanceTimersByTimeAsync(0) })
    expect(fetchFn).toHaveBeenCalledTimes(61)
  })
  it('慢请求期间不叠加轮询，错误后自动停但允许重试', async () => {
    vi.useFakeTimers()
    let rejectRequest!: (reason: Error) => void
    const fetchFn = vi.fn().mockReturnValueOnce(new Promise((_resolve, reject) => { rejectRequest = reject })).mockImplementation(async () => response(order))
    renderPage(fetchFn)
    await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '刷新订单状态' })).toBeDisabled()
    await act(async () => { rejectRequest(new Error('offline')); await vi.advanceTimersByTimeAsync(60000) })
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await act(async () => { screen.getByRole('button', { name: '刷新订单状态' }).click(); await vi.advanceTimersByTimeAsync(0) })
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(screen.getByText('等待付款确认')).toBeInTheDocument()
  })
})
