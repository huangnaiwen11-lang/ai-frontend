import { Link } from 'react-router-dom'
import { isGoApiError } from '../../api/http'
import { ROUTES } from '../../app/routes'

/** 门禁和预扣结果只认 Go；三个创作页面不根据余额或 VIP 本地猜测是否可创建。 */
export function CreationError({ error }: { error: Error }) {
  if (isGoApiError(error)) {
    switch (error.kind) {
      case 'insufficient_balance':
        return <p role="alert">{error.message}，<Link to={ROUTES.wallet}>前往充值</Link></p>
      case 'phone_binding_required':
        return <p role="alert">请先完成账号绑定后再生成。</p>
      case 'vip_required':
        return <p role="alert">该能力需要 VIP 权益。</p>
      case 'unauthenticated':
        return <p role="alert">登录已失效，请<Link to={ROUTES.login}>重新登录</Link>。</p>
      case 'request_conflict':
        return <p role="alert">同一请求正在处理，请勿重复提交。</p>
    }
  }
  return <p role="alert">{error.message}</p>
}
