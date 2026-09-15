import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PaymentApi } from '../../api/payments'
import { GoApiClient } from '../../api/http'
import { GoApiProvider } from '../../app/GoApiProvider'
import { PaymentPage } from './PaymentPage'

const goBaseUrl = 'http://127.0.0.1:18000'
const sessionStore = { getToken: () => 'go-session-token' }

describe('受控支付入口', () => {
  // 商品客户端及完整下单交互由 checkout.test.tsx 覆盖；本文件聚焦钱包和账本合同。
  beforeEach(() => {
    vi.spyOn(PaymentApi.prototype, 'listProducts').mockResolvedValue({ products: [
      { id: 'coins_100', version: 1, label: '100 钻石', diamondAmount: 100, amountCents: 299, currency: 'USD' },
    ] })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('只将商品 ID 交给 Go 本地支付入口，并明确标记本地联调模式', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(walletSummary()))
      .mockResolvedValueOnce(jsonResponse({ entries: [], nextCursor: null }))
      .mockResolvedValueOnce(
        jsonResponse({ orderId: 'order-1', checkoutUrl: '', credits: 100, integrationMode: 'local_only' }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderPaymentPage()
    await user.click(await screen.findByRole('button', { name: '创建充值订单' }))

    const [url, init] = fetchMock.mock.calls[2] as [string, RequestInit]
    expect(url).toBe(`${goBaseUrl}/api/wallet/create-external-checkout`)
    expect(JSON.parse(init.body as string)).toEqual({ productId: 'coins_100' })
    expect(init.body).not.toContain('credits')
    expect(init.body).not.toContain('balance')
    expect(await screen.findByText('本地联调收银台')).toBeInTheDocument()
  })

  it('从 Go 钱包合同加载完整概览和首屏账本，不向请求透露用户或权益字段', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          balance: 0,
          vip: { active: true, expiresAt: '2026-10-11T08:00:00Z' },
          timezone: 'Asia/Shanghai',
          localDate: '2026-09-11',
          dailyImage: { limit: 10, used: 2, remaining: 8 },
          dailyVideo: { limit: 3, used: 1, remaining: 2 },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          entries: [
            {
              id: 'ledger-1',
              creationId: 'creation-1',
              deltaDiamonds: -20,
              reason: 'generation_reservation',
              createdAt: '2026-09-11T08:30:00Z',
            },
          ],
          nextCursor: null,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    renderPaymentPage()

    expect(await screen.findByRole('heading', { name: '我的钱包' })).toBeInTheDocument()
    expect(screen.getByText('0 钻石')).toBeInTheDocument()
    expect(screen.getByText('VIP 有效')).toBeInTheDocument()
    expect(screen.getByText('时区：Asia/Shanghai')).toBeInTheDocument()
    expect(screen.getByText('本地日期：2026-09-11')).toBeInTheDocument()
    expect(screen.getByText('图片日额度：8 / 10')).toBeInTheDocument()
    expect(screen.getByText('视频日额度：2 / 3')).toBeInTheDocument()
    expect(screen.getByText('-20')).toBeInTheDocument()
    expect(screen.getByText('generation_reservation')).toBeInTheDocument()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const [summaryUrl, summaryInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    const [ledgerUrl, ledgerInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(summaryUrl).toBe(`${goBaseUrl}/api/wallet/summary`)
    expect(ledgerUrl).toBe(`${goBaseUrl}/api/wallet/ledger?limit=20`)
    expect(summaryInit.method).toBe('GET')
    expect(ledgerInit.method).toBe('GET')
    expect(new Headers(summaryInit.headers).get('Authorization')).toBe('Bearer go-session-token')
    expect(new Headers(ledgerInit.headers).get('Authorization')).toBe('Bearer go-session-token')
    expect(summaryUrl).not.toContain('userId')
    expect(ledgerUrl).not.toContain('userId')
    expect(summaryUrl).not.toContain('balance')
    expect(ledgerUrl).not.toContain('vip')
  })

  it('加载更多账本时只原样回传 Go 的 nextCursor，不混用 skip 分页', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(walletSummary()))
      .mockResolvedValueOnce(
        jsonResponse({
          entries: [{ id: 'ledger-1', creationId: 'creation-1', deltaDiamonds: -20, reason: 'first', createdAt: '2026-09-11T08:30:00Z' }],
          nextCursor: 'go-issued-cursor',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          entries: [{ id: 'ledger-2', creationId: 'creation-2', deltaDiamonds: 20, reason: 'second', createdAt: '2026-09-11T08:00:00Z' }],
          nextCursor: null,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderPaymentPage()
    await user.click(await screen.findByRole('button', { name: '加载更多账本' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(fetchMock.mock.calls[2]?.[0]).toBe(`${goBaseUrl}/api/wallet/ledger?limit=20&cursor=go-issued-cursor`)
    expect(fetchMock.mock.calls[2]?.[0]).not.toContain('skip=')
    expect(screen.getByText('second')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '加载更多账本' })).not.toBeInTheDocument()
  })

  it('Go 返回 401 时以可访问错误提示登录已失效，而不是展示伪造的钱包数据', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonErrorResponse(401, 'UNAUTHORIZED', '登录已失效，请重新登录'))
      .mockResolvedValueOnce(jsonResponse({ entries: [], nextCursor: null }))
    vi.stubGlobal('fetch', fetchMock)

    renderPaymentPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('登录已失效，请重新登录')
    expect(screen.queryByLabelText('钱包概览')).not.toBeInTheDocument()
  })

  it('账本为空时显示可访问的空状态，并且不展示加载更多按钮', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(walletSummary()))
      .mockResolvedValueOnce(jsonResponse({ entries: [], nextCursor: null }))
    vi.stubGlobal('fetch', fetchMock)

    renderPaymentPage()

    expect(await screen.findByText('暂无账本记录')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '加载更多账本' })).not.toBeInTheDocument()
  })
})

function renderPaymentPage() {
  return render(
    <GoApiProvider client={new GoApiClient({ baseUrl: goBaseUrl, sessionStore })}>
      <PaymentPage />
    </GoApiProvider>,
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

function walletSummary() {
  return {
    balance: 0,
    vip: { active: false, expiresAt: null },
    timezone: 'Asia/Shanghai',
    localDate: '2026-09-11',
    dailyImage: { limit: 0, used: 0, remaining: 0 },
    dailyVideo: { limit: 0, used: 0, remaining: 0 },
  }
}
