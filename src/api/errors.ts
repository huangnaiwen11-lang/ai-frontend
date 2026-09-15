export type GoApiErrorKind =
  | 'unauthenticated'
  | 'insufficient_balance'
  | 'phone_binding_required'
  | 'vip_required'
  | 'request_conflict'
  | 'system_unavailable'
  | 'unknown'

export type GoApiError = Error & {
  kind: GoApiErrorKind
  status: number
  code?: string
}

/**
 * HTTP 状态决定大类，Go 的业务码再区分同为 403 的两个门禁。
 * 不能只根据文案判断，否则游客绑定和购买 VIP 会被错误地引导到同一条路径。
 */
export function createGoApiError(status: number, code?: string, message?: string): GoApiError {
  const kind = resolveErrorKind(status, code)
  const error = new Error(message || defaultMessage(kind)) as GoApiError
  error.name = 'GoApiError'
  error.kind = kind
  error.status = status
  error.code = code
  return error
}

function resolveErrorKind(status: number, code?: string): GoApiErrorKind {
  switch (status) {
    case 401:
      return 'unauthenticated'
    case 402:
      return 'insufficient_balance'
    case 403:
      if (code === 'ACCOUNT_BINDING_REQUIRED') return 'phone_binding_required'
      if (code === 'VIP_REQUIRED') return 'vip_required'
      return 'unknown'
    case 409:
      return 'request_conflict'
    default:
      return status >= 500 ? 'system_unavailable' : 'unknown'
  }
}

function defaultMessage(kind: GoApiErrorKind): string {
  const messages: Record<GoApiErrorKind, string> = {
    unauthenticated: '登录已失效，请重新登录',
    insufficient_balance: '钻石余额不足',
    phone_binding_required: '请先完成账号绑定',
    vip_required: '该功能需要 VIP 权益',
    request_conflict: '该请求已存在，请勿重复提交',
    system_unavailable: '服务暂不可用，请稍后重试',
    unknown: '请求未能完成',
  }
  return messages[kind]
}
