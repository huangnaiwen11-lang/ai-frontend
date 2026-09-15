import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock3, RefreshCw } from 'lucide-react'
import { PaymentApi } from '../../api/payments'
import { isPaymentOrderId } from '../../api/payment-contract'
import { useGoApiClient } from '../../app/GoApiProvider'
import { ROUTES } from '../../app/routes'
import { usePaymentOrder } from './usePaymentOrder'
import './payment.css'

export function PaymentResultPage() {
  const [search] = useSearchParams()
  const orderIds = search.getAll('orderId')
  const orderId = orderIds.length === 1 && isPaymentOrderId(orderIds[0]) ? orderIds[0] : null
  return <main className="payment-page">
    <h1>支付结果</h1>
    {/* URL 只提供订单编号。status、paid、金额等回跳参数一律不作为到账证据。 */}
    {orderId ? <OrderStatus key={orderId} orderId={orderId} /> : <p role="alert">订单编号无效</p>}
    <Link to={ROUTES.wallet}>返回钱包</Link>
  </main>
}

function OrderStatus({ orderId }: { orderId: string }) {
  const client = useGoApiClient()
  const api = useMemo(() => new PaymentApi(client), [client])
  const { order, error, loading, paused, refresh } = usePaymentOrder(api, orderId)
  return <section className="payment-order" aria-label="订单状态">
    {loading && !order && <p role="status">正在读取订单状态…</p>}
    {error && <p role="alert">{error}</p>}
    {order && <>
      <h2 role="status">{order.status === 'paid' ? <><CheckCircle2 aria-hidden="true" />支付成功，钻石已到账</> : <><Clock3 aria-hidden="true" />等待付款确认</>}</h2>
      <dl><dt>订单编号</dt><dd>{order.orderId}</dd><dt>钻石</dt><dd>{order.credits}</dd><dt>金额</dt><dd>{order.currency} {(order.amountCents / 100).toFixed(2)}</dd></dl>
    </>}
    {paused && <p>暂未收到付款确认，请稍后刷新。</p>}
    {order?.status !== 'paid' && <button type="button" disabled={loading} onClick={refresh}><RefreshCw size={16} aria-hidden="true" />刷新订单状态</button>}
  </section>
}
