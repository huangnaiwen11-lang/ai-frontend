import type { SessionReader } from '../../api/http'

const TOKEN_KEY = 'ai-frontend-service.go-session-token'

/**
 * Go 会话与旧站登录态彻底隔离，且仅保存于 sessionStorage。
 * 关闭浏览器标签后令牌自然失效，避免把重构期会话长期遗留在用户设备。
 */
export class BrowserSessionStore implements SessionReader {
  public getToken(): string | null {
    return window.sessionStorage.getItem(TOKEN_KEY)
  }

  public setToken(token: string): void {
    window.sessionStorage.setItem(TOKEN_KEY, token)
  }

  public clear(): void {
    window.sessionStorage.removeItem(TOKEN_KEY)
  }
}
