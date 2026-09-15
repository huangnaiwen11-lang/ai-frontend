import { useEffect, useMemo, useRef, useState } from 'react'
import { Diamond, ExternalLink, RefreshCw } from 'lucide-react'
import { PaymentApi, type CheckoutResult, type PaymentProduct } from '../../api/payments'
import { isPaymentOrderId, safeCheckoutUrl } from '../../api/payment-contract'
import { useGoApiClient } from '../../app/GoApiProvider'
import './payment.css'

export function CheckoutPanel() {
  const client = useGoApiClient()
  const api = useMemo(() => new PaymentApi(client), [client])
  const [products, setProducts] = useState<PaymentProduct[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const lock = useRef(false)
  const mounted = useRef(false)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    let active = true
    setLoading(true)
    setCatalogError(null)
    void api.listProducts().then(({ products: loaded }) => {
      if (!active) return
      setProducts(loaded)
      setSelectedId(loaded[0]?.id ?? '')
    }).catch((reason: unknown) => {
      if (active) { setProducts([]); setCatalogError(message(reason, '读取商品失败')) }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api, reload])

  async function submit() {
    // ref 锁在同一事件批次立即生效，不依赖下一次 React 渲染来防止双建单。
    if (lock.current || loading || !products.some((item) => item.id === selectedId)) return
    lock.current = true
    setSubmitting(true)
    setError(null)
    setCheckout(null)
    try {
      const result = await api.createCheckout({ productId: selectedId })
      if (!isPaymentOrderId(result.orderId) || (result.integrationMode !== 'local_only' && result.integrationMode !== 'paycores') ||
        (result.integrationMode === 'paycores' && !safeCheckoutUrl(result.checkoutUrl))) throw new Error('收银台返回的信息无效，请查看订单后再试')
      if (mounted.current) setCheckout(result)
    } catch (reason) {
      if (mounted.current) setError(message(reason, '创建充值订单失败'))
    } finally {
      lock.current = false
      if (mounted.current) setSubmitting(false)
    }
  }

  return <section className="payment-checkout" aria-label="钻石充值">
    <h2><Diamond size={20} aria-hidden="true" /> 钻石充值</h2>
    {loading && <p role="status">正在读取充值商品…</p>}
    {catalogError && <><p role="alert">{catalogError}</p><button type="button" onClick={() => setReload((value) => value + 1)}><RefreshCw size={16} aria-hidden="true" />重试读取商品</button></>}
    {!loading && !catalogError && products.length === 0 && <p>暂无可购买的钻石套餐</p>}
    {products.length > 0 && <>
      <fieldset className="payment-products" disabled={submitting || loading}>
        <legend>选择钻石套餐</legend>
        {products.map((product) => <label className="payment-product" key={product.id}>
          <input type="radio" name="payment-product" value={product.id} checked={selectedId === product.id} onChange={() => { setSelectedId(product.id); setCheckout(null); setError(null) }} />
          <span><strong>{product.label}</strong><small>{product.diamondAmount} 钻石</small></span>
          <span className="payment-product__price">{product.currency} {(product.amountCents / 100).toFixed(2)}</span>
        </label>)}
      </fieldset>
      <button type="button" className="payment-submit" disabled={submitting || loading} onClick={() => void submit()}>{submitting ? '正在创建订单…' : '创建充值订单'}</button>
    </>}
    {error && <p role="alert">{error}</p>}
    {checkout && <div className="payment-checkout__result" role="status">
      {checkout.integrationMode === 'local_only' ? <p>本地联调收银台</p> : <a href={safeCheckoutUrl(checkout.checkoutUrl)!} target="_blank" rel="noopener noreferrer">前往 PayCores 收银台 <ExternalLink size={16} aria-hidden="true" /></a>}
      <a href={`/payment/result?orderId=${checkout.orderId}`}>查看订单状态</a>
    </div>}
  </section>
}

function message(reason: unknown, fallback: string) { return reason instanceof Error ? reason.message : fallback }
