import { Navigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '../../app/routes'
import { PaymentPage } from './PaymentPage'
import { PaymentResultPage } from './PaymentResultPage'

/** 充值回跳只将订单编号交给只读结果页，不能继承金额、成功状态或任何结算指令。 */
export function PaymentReturnRoute({ legacy = false }: { legacy?: boolean }) {
  const [search] = useSearchParams()
  if (search.has('orderId')) return <PaymentResultPage />
  return legacy ? <Navigate to={ROUTES.wallet} replace /> : <PaymentPage />
}
