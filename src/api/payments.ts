import type { GoApiClient } from './http'

export type CheckoutResult = {
  orderId: string
  checkoutUrl: string
  credits: number
  integrationMode: 'local_only' | 'paycores'
}

export type StoreProvider = 'apple' | 'google'

export type VerifyPurchaseInput = {
  provider: StoreProvider
  receipt: string
  productId: string
  storeProductId?: string
}

/**
 * 支付客户端只表达商品和已获得的商店回执。
 * 金额、钻石和 VIP 都必须由 Go 商品快照及回调入账决定，浏览器无权指定。
 */
export class PaymentApi {
  public constructor(private readonly client: GoApiClient) {}

  public createCheckout(input: { productId: string }): Promise<CheckoutResult> {
    return this.client.post('/api/wallet/create-external-checkout', input)
  }

  public verifyPurchase(input: VerifyPurchaseInput): Promise<{ balance: number; coins: number; duplicate: boolean }> {
    return this.client.post('/api/wallet/verify-purchase', input)
  }
}
