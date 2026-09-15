/**
 * 将运行时配置限制为 Origin，避免页面把任意路径、凭据或查询参数拼进 API 地址。
 * 这也是 Go-only 边界的一部分：业务接口只能从这个受控基地址继续拼接相对路径。
 */
export function resolveApiBaseUrl(raw: string | undefined): string {
  const value = raw?.trim()
  if (!value) {
    throw new Error('缺少 VITE_GO_API_BASE_URL')
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('VITE_GO_API_BASE_URL 无效')
  }

  // URL.origin 会去除路径和凭据；两者不一致就说明配置不是纯服务 Origin。
  if (url.origin !== url.toString().replace(/\/$/, '')) {
    throw new Error('VITE_GO_API_BASE_URL 必须是 Origin')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('VITE_GO_API_BASE_URL 无效')
  }

  return url.origin
}
