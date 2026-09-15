import { useCallback, useEffect, useRef, useState } from 'react'
import { PaymentApi, type PaymentOrderStatus } from '../../api/payments'

const POLL_INTERVAL_MS = 5000
const MAX_AUTO_CHECKS = 60

/** 只轮询本人的 Go 订单。串行定时防止请求堆积，错误或到账即停，手动刷新可重新查询。 */
export function usePaymentOrder(api: PaymentApi, orderId: string) {
  const [order, setOrder] = useState<PaymentOrderStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [paused, setPaused] = useState(false)
  const refreshRef = useRef<() => void>(() => {})

  useEffect(() => {
    let active = true
    let inFlight = false
    let checks = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    async function check(manual = false) {
      if (!active || inFlight) return
      clearTimeout(timer)
      if (manual) checks = 0
      inFlight = true
      setLoading(true)
      setError(null)
      setPaused(false)
      try {
        const value = await api.getOrderStatus(orderId)
        if (!active) return
        setOrder(value)
        checks += 1
        if (value.status === 'pending') {
          if (checks < MAX_AUTO_CHECKS) timer = setTimeout(() => void check(), POLL_INTERVAL_MS)
          else setPaused(true)
        }
      } catch (reason) {
        if (active) { setOrder(null); setError(reason instanceof Error ? reason.message : '读取订单失败') }
      } finally {
        inFlight = false
        if (active) setLoading(false)
      }
    }
    setOrder(null)
    refreshRef.current = () => { void check(true) }
    void check()
    return () => { active = false; clearTimeout(timer); refreshRef.current = () => {} }
  }, [api, orderId])

  return { order, error, loading, paused, refresh: useCallback(() => refreshRef.current(), []) }
}
