import type { GoApiClient } from './http'

export type NotificationItem = {
  id: string
  userId: string
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
  read: boolean
  readAt: string | null
  createdAt: string
}

export type NotificationPage = { items: NotificationItem[]; unreadCount: number }

/** 通知 API 只封装 Go 合同，页面不得自行拼接用户 ID 或旧 Node 地址。 */
export class NotificationsApi {
  public constructor(private readonly client: GoApiClient) {}

  public list(limit = 50, unreadOnly = false): Promise<NotificationPage> {
    return this.client.get('/api/notifications', unreadOnly ? { limit, unreadOnly: 'true' } : { limit })
  }

  public unreadCount(): Promise<{ count: number }> {
    return this.client.get('/api/notifications/unread-count')
  }

  public markRead(id: string): Promise<{ id: string; read: boolean }> {
    return this.client.post(`/api/notifications/${notificationId(id)}/read`, {})
  }

  public markAllRead(): Promise<{ updated: number }> {
    return this.client.post('/api/notifications/read-all', {})
  }

  public remove(id: string): Promise<{ id: string; deleted: boolean }> {
    return this.client.delete(`/api/notifications/${notificationId(id)}`)
  }

  /** 只清除当前会话下已读记录；服务端固定删除条件，前端不传筛选范围。 */
  public clearRead(): Promise<{ deleted: number }> {
    return this.client.delete('/api/notifications')
  }
}

function notificationId(id: string): string {
  // Go 路由只接受单段 ID；拒绝路径分隔符，避免把客户端输入变成任意 API 路径。
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('通知 ID 无效')
  return id
}
