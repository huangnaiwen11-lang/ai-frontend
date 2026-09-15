import { describe, expect, it } from 'vitest'
import { createGoApiError } from './errors'

describe('createGoApiError', () => {
  it('将 402 映射为余额不足', () => {
    expect(createGoApiError(402, 'INSUFFICIENT_FUNDS', '钻石余额不足')).toMatchObject({
      kind: 'insufficient_balance',
      status: 402,
    })
  })

  it('将游客绑定与 VIP 门禁保持为两个不同动作', () => {
    expect(createGoApiError(403, 'ACCOUNT_BINDING_REQUIRED', '请先完成账号绑定')).toMatchObject({
      kind: 'phone_binding_required',
      status: 403,
    })
    expect(createGoApiError(403, 'VIP_REQUIRED', '该功能需要 VIP 权益')).toMatchObject({
      kind: 'vip_required',
      status: 403,
    })
  })
})
