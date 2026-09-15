import { createContext, type ReactNode, useContext } from 'react'
import type { GoApiClient } from '../api/http'

const GoApiContext = createContext<GoApiClient | null>(null)

/**
 * 应用在启动时只构造一个 Go 客户端，所有 feature 通过该端口访问服务端。
 * 这让认证、创作与支付共享同一种请求安全策略，却不会互相依赖业务实现。
 */
export function GoApiProvider({ client, children }: { client: GoApiClient; children: ReactNode }) {
  return <GoApiContext.Provider value={client}>{children}</GoApiContext.Provider>
}

export function useGoApiClient(): GoApiClient {
  const client = useContext(GoApiContext)
  if (!client) {
    throw new Error('useGoApiClient 必须在 GoApiProvider 内使用')
  }
  return client
}
