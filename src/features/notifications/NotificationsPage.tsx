import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CheckCheck, LoaderCircle, Trash2 } from 'lucide-react'
import { isGoApiError } from '../../api/http'
import { NotificationsApi, type NotificationItem } from '../../api/notifications'
import { useGoApiClient } from '../../app/GoApiProvider'
import './notifications.css'

type Filter = 'all' | 'unread'

/**
 * 通知中心只读取和修改当前 Go 会话的通知事实。
 * 每次写入后重新读取服务端列表，避免本地乐观状态在并发请求下漂移。
 */
export function NotificationsPage() {
  const client = useGoApiClient()
  const api = useMemo(() => new NotificationsApi(client), [client])
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requestGenerationRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    // React 开发 Strict Mode 会执行一次 setup → cleanup → setup；每次 setup 都必须恢复挂载标记。
    mountedRef.current = true
    return () => { mountedRef.current = false; requestGenerationRef.current += 1 }
  }, [])

  const load = useCallback(async (nextFilter: Filter) => {
    const requestGeneration = ++requestGenerationRef.current
    const isCurrent = () => mountedRef.current && requestGeneration === requestGenerationRef.current
    if (isCurrent()) setLoading(true)
    try {
      const page = await api.list(50, nextFilter === 'unread')
      if (!isCurrent()) return
      setItems(page.items)
      setUnreadCount(page.unreadCount)
      setError(null)
    } catch (cause) {
      if (isCurrent()) setError(messageFor(cause, '读取通知失败'))
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [api])

  useEffect(() => { void load(filter) }, [filter, load])

  const runAction = useCallback(async (name: string, action: () => Promise<unknown>) => {
    if (activeAction) return
    setActiveAction(name)
    setError(null)
    try {
      await action()
      // 重新拉取同一筛选条件的权威结果，通知数量和已读状态由服务端决定。
      await load(filter)
    } catch (cause) {
      if (mountedRef.current) setError(messageFor(cause, '处理通知失败'))
    } finally {
      if (mountedRef.current) setActiveAction(null)
    }
  }, [activeAction, filter, load])

  const switchFilter = (nextFilter: Filter) => {
    if (!activeAction && nextFilter !== filter) setFilter(nextFilter)
  }

  return <main className="notifications-page" aria-labelledby="notifications-title">
    <header className="notifications-page__header">
      <div><p className="notifications-page__eyebrow"><Bell size={15} /> 通知中心</p><h1 id="notifications-title">通知</h1><span aria-live="polite">未读 {unreadCount} 条</span></div>
      <div className="notifications-page__actions">
        <button type="button" className="notifications-page__action" disabled={Boolean(activeAction) || unreadCount === 0} onClick={() => void runAction('read-all', () => api.markAllRead())}><CheckCheck size={16} />全部标记为已读</button>
        <button type="button" className="notifications-page__action notifications-page__action--danger" disabled={Boolean(activeAction) || !items.some((item) => item.read)} onClick={() => void runAction('clear-read', () => api.clearRead())}><Trash2 size={16} />清除已读</button>
      </div>
    </header>

    <div className="notifications-page__filters" role="group" aria-label="通知筛选">
      <button type="button" aria-pressed={filter === 'all'} disabled={Boolean(activeAction)} onClick={() => switchFilter('all')}>全部通知</button>
      <button type="button" aria-pressed={filter === 'unread'} disabled={Boolean(activeAction)} onClick={() => switchFilter('unread')}>仅看未读</button>
    </div>

    {loading ? <p className="notifications-page__status" role="status"><LoaderCircle size={18} />正在读取通知…</p> : null}
    {error ? <p className="notifications-page__error" role="alert">{error}</p> : null}
    {!loading && !error && items.length === 0 ? <section className="notifications-page__empty"><Bell size={24} /><h2>{filter === 'unread' ? '暂无未读通知' : '暂无通知'}</h2><p>新的生成进度、支付和账户消息会在这里出现。</p></section> : null}

    <ul className="notifications-page__list" aria-label="通知列表" aria-busy={loading}>
      {items.map((item) => <li key={item.id} className={item.read ? 'is-read' : 'is-unread'}>
        <article aria-label={item.title}>
          <div className="notifications-page__item-main"><span className="notifications-page__dot" aria-label={item.read ? '已读' : '未读'} /><div><h2>{item.title}</h2><p>{item.body}</p><small>{formatDate(item.createdAt)}</small></div></div>
          <div className="notifications-page__item-actions">
            {!item.read ? <button type="button" disabled={Boolean(activeAction)} onClick={() => void runAction(`read:${item.id}`, () => api.markRead(item.id))}>标为已读</button> : <span>已读</span>}
            <button type="button" aria-label={`删除：${item.title}`} disabled={Boolean(activeAction)} onClick={() => void runAction(`delete:${item.id}`, () => api.remove(item.id))}><Trash2 size={15} /></button>
          </div>
        </article>
      </li>)}
    </ul>
  </main>
}

function messageFor(cause: unknown, fallback: string): string {
  return isGoApiError(cause) ? cause.message : fallback
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString()
}
