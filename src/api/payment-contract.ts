/** 展示合同只保留商品快照与订单事实，不向页面透传用户、回执或支付密钥。 */
export type PaymentProduct = {
  id: string
  version: number
  label: string
  diamondAmount: number
  amountCents: number
  currency: string
}

export type PaymentOrderStatus = {
  orderId: string
  productId: string
  status: 'pending' | 'paid'
  provider: string
  amountCents: number
  currency: string
  credits: number
  paymentReceived: boolean
  backendReady: boolean
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}
function text(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0 }
function currency(value: unknown): value is string { return typeof value === 'string' && /^[A-Z]{3}$/.test(value) }

/** 订单仅作为单个路径段传递；拒绝点路径和编码分隔符，不能改变 Gateway 路由。 */
export function isPaymentOrderId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value)
}

export function parseProducts(value: unknown): { products: PaymentProduct[] } {
  if (!record(value) || !Array.isArray(value.products)) throw new Error('充值商品数据无效')
  const ids = new Set<string>()
  return { products: value.products.map((item: unknown) => {
    if (!record(item) || !text(item.id) || ids.has(item.id) || !text(item.label) || !positiveInteger(item.version) ||
      !positiveInteger(item.diamondAmount) || !positiveInteger(item.amountCents) || !currency(item.currency)) throw new Error('充值商品数据无效')
    ids.add(item.id)
    return { id: item.id, version: item.version, label: item.label, diamondAmount: item.diamondAmount, amountCents: item.amountCents, currency: item.currency }
  }) }
}

export function parseOrder(value: unknown, orderId: string): PaymentOrderStatus {
  if (!record(value) || value.orderId !== orderId || !text(value.productId) || !text(value.provider) ||
    !positiveInteger(value.credits) || typeof value.amountCents !== 'number' || !Number.isSafeInteger(value.amountCents) || value.amountCents < 0 ||
    !currency(value.currency) || (value.status !== 'pending' && value.status !== 'paid') ||
    value.paymentReceived !== (value.status === 'paid') || value.backendReady !== (value.status === 'paid')) throw new Error('订单状态数据无效')
  return { orderId, productId: value.productId, status: value.status, provider: value.provider, amountCents: value.amountCents, currency: value.currency,
    credits: value.credits, paymentReceived: value.paymentReceived, backendReady: value.backendReady }
}

/** 外部收银台必须 HTTPS；受控本地 mock 只允许回环 HTTP，拒绝凭据、脚本和协议相对 URL。 */
export function safeCheckoutUrl(value: string): string | null {
  if (/[\s\\\u0000-\u001f]/.test(value)) return null
  try {
    const url = new URL(value)
    if (url.username || url.password) return null
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) ? url.href : null
  } catch { return null }
}
