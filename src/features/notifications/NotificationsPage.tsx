import { useCallback, useEffect, useMemo, useState } from 'react'
import { isGoApiError } from '../../api/http'
import { NotificationsApi, type NotificationItem } from '../../api/notifications'
import { useGoApiClient } from '../../app/GoApiProvider'

/** 用户通知中心：列表、单条已读、全部已读和删除均通过 Go 会话完成。 */
export function NotificationsPage() {
  const client = useGoApiClient()
  const api = useMemo(() => new NotificationsApi(client), [client])
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await api.list()
      setItems(page.items)
      setUnreadCount(page.unreadCount)
    } catch (cause) {
      setError(isGoApiError(cause) ? cause.message : '读取通知失败')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { void load() }, [load])

  async function markRead(item: NotificationItem) {
    if (item.read) return
    try {
      await api.markRead(item.id)
      setItems((current) => current.map((value) => value.id === item.id ? { ...value, read: true, readAt: new Date().toISOString() } : value))
      setUnreadCount((count) => Math.max(0, count - 1))
    } catch (cause) {
      setError(isGoApiError(cause) ? cause.message : '标记通知失败')
    }
  }

  async function markAllRead() {
    try {
      await api.markAllRead()
      setItems((current) => current.map((value) => ({ ...value, read: true, readAt: value.readAt ?? new Date().toISOString() })))
      setUnreadCount(0)
    } catch (cause) {
      setError(isGoApiError(cause) ? cause.message : '标记通知失败')
    }
  }

  async function remove(id: string) {
    try {
      await api.remove(id)
      setItems((current) => current.filter((item) => item.id !== id))
    } catch (cause) {
      setError(isGoApiError(cause) ? cause.message : '删除通知失败')
    }
  }

  return <main>
    <h1>通知</h1>
    <p aria-live="polite">未读 {unreadCount} 条</p>
    {loading ? <p role="status">正在读取通知…</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {!loading && !error && items.length === 0 ? <p>暂无通知</p> : null}
    {unreadCount > 0 ? <button type="button" onClick={() => void markAllRead()}>全部标记为已读</button> : null}
    <ul aria-label="通知列表">
      {items.map((item) => <li key={item.id}>
        <article aria-label={item.title}>
          <h2>{item.title}</h2>
          <p>{item.body}</p>
          <small>{new Date(item.createdAt).toLocaleString()}</small>
          {!item.read ? <button type="button" onClick={() => void markRead(item)}>标为已读</button> : <span>已读</span>}
          <button type="button" onClick={() => void remove(item.id)}>删除</button>
        </article>
      </li>)}
    </ul>
  </main>
}
