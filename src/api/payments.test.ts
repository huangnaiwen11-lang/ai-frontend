import { describe, expect, it, vi } from 'vitest'
import { GoApiClient } from './http'
import { PaymentApi } from './payments'
import { safeCheckoutUrl } from './payment-contract'

const product = { id: 'coins_300', version: 2, label: '300 钻石', diamondAmount: 300, amountCents: 599, currency: 'USD' }
const order = { orderId: 'order-1', productId: 'coins_300', status: 'pending', provider: 'paycores', amountCents: 599, currency: 'USD', credits: 300, paymentReceived: false, backendReady: false }
function setup(data: unknown) {
  const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } }))
  const api = new PaymentApi(new GoApiClient({ baseUrl: 'http://localhost:18000', sessionStore: { getToken: () => 'local-session' }, fetchFn }))
  return { api, fetchFn }
}

describe('支付只读合同', () => {
  it.each(['https://user:secret@example.test/pay', 'http://example.test/pay', '//example.test/pay', 'javascript:alert(1)', 'https://example.test/\\pay'])('拒绝非安全收银台地址 %s', (url) => {
    expect(safeCheckoutUrl(url)).toBeNull()
  })
  it.each(['https://example.test/pay', 'http://127.0.0.1:18000/pay', 'http://localhost:18000/pay'])('保留 HTTPS 或明确本地收银台地址 %s', (url) => {
    expect(safeCheckoutUrl(url)).toBe(url)
  })
  it('读取商品白名单，不向外泄漏内部字段', async () => {
    const { api, fetchFn } = setup({ products: [{ ...product, secret: 'internal' }] })
    expect(await api.listProducts()).toEqual({ products: [product] })
    expect(fetchFn.mock.calls[0][0]).toBe('http://localhost:18000/api/wallet/products')
    expect(new Headers(fetchFn.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer local-session')
  })
  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])('拒绝无效金额 %s', async (amountCents) => {
    const { api } = setup({ products: [{ ...product, amountCents }] })
    await expect(api.listProducts()).rejects.toThrow('充值商品数据无效')
  })
  it('读取冻结订单状态而不是请求入账', async () => {
    const { api, fetchFn } = setup({ ...order, userId: 'hidden' })
    expect(await api.getOrderStatus('order-1')).toEqual(order)
    expect(fetchFn.mock.calls[0][0]).toBe('http://localhost:18000/api/payments/order-status/order-1')
    expect(fetchFn.mock.calls[0][1].method).toBe('GET')
  })
  it.each(['../order-1', 'a/b', 'x?paid=true', '', 'a%2Fb'])('拒绝不安全的订单 ID %s', async (id) => {
    const { api, fetchFn } = setup(order)
    await expect(api.getOrderStatus(id)).rejects.toThrow('订单编号无效')
    expect(fetchFn).not.toHaveBeenCalled()
  })
  it('响应订单不一致不能显示其它订单已付款', async () => {
    const { api } = setup({ ...order, orderId: 'other', status: 'paid', paymentReceived: true, backendReady: true })
    await expect(api.getOrderStatus('order-1')).rejects.toThrow('订单状态数据无效')
  })
  it('paid 与入账确认不一致时拒绝成功状态', async () => {
    const { api } = setup({ ...order, status: 'paid' })
    await expect(api.getOrderStatus('order-1')).rejects.toThrow('订单状态数据无效')
  })
})
