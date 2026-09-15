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

/** 仅保留 AI 工作室的投递偏好，不含旧站社交消息或第三方订阅信息。 */
export type NotificationPreferences = {
  pushEnabled: boolean
  emailEnabled: boolean
  generationCompletedEnabled: boolean
}

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

  /** 偏好永远由 Go 当前会话归属，调用方不得传 userId。 */
  public getPreferences(): Promise<NotificationPreferences> {
	return this.client.get('/api/notifications/preferences')
  }

  /** 一次写入完整快照，避免三次独立请求在并发下彼此覆盖。 */
  public savePreferences(preferences: NotificationPreferences): Promise<NotificationPreferences> {
	return this.client.patch('/api/notifications/preferences', preferences)
  }
}

function notificationId(id: string): string {
  // Go 路由只接受单段 ID；拒绝路径分隔符，避免把客户端输入变成任意 API 路径。
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('通知 ID 无效')
  return id
}
