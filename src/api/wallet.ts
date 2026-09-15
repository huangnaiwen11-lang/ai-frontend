import type { GoApiClient } from './http'

/** Go 钱包概览的只读事实；浏览器不计算余额、VIP 或日额度。 */
export type WalletSummary = {
  balance: number
  vip: {
    active: boolean
    expiresAt: string | null
  }
  timezone: string
  localDate: string
  dailyImage: DailyQuota
  dailyVideo: DailyQuota
}

export type DailyQuota = {
  limit: number
  used: number
  remaining: number
}

/** 服务端账本分录原样展示，reason 不在前端推测为任何业务结论。 */
export type WalletLedgerEntry = {
  id: string
  creationId: string
  deltaDiamonds: number
  reason: string
  createdAt: string
}

export type WalletLedgerPage = {
  entries: WalletLedgerEntry[]
  nextCursor: string | null
}

/**
 * 钱包只读 API 边界。
 * 用户身份只能由 GoApiClient 附带的 Go 会话确定，因此没有 userId、余额或权益入参。
 */
export class WalletApi {
  public constructor(private readonly client: GoApiClient) {}

  public getSummary(): Promise<WalletSummary> {
    return this.client.get('/api/wallet/summary')
  }

  public listLedger(input: { limit: number; cursor?: string }): Promise<WalletLedgerPage> {
    return this.client.get('/api/wallet/ledger', {
      limit: input.limit,
      // 续页只回传 Go 生成的不透明游标，绝不混入 offset/skip 基准。
      cursor: input.cursor,
    })
  }
}
