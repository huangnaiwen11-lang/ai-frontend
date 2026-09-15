import { describe, expect, it } from 'vitest'
import { resolveApiBaseUrl } from './config'

describe('resolveApiBaseUrl', () => {
  it('缺失 Go API 地址时拒绝启动', () => {
    expect(() => resolveApiBaseUrl(undefined)).toThrow('缺少 VITE_GO_API_BASE_URL')
  })

  it('接受纯 Origin 形式的本地 Go Gateway 地址', () => {
    expect(resolveApiBaseUrl('http://127.0.0.1:18000')).toBe('http://127.0.0.1:18000')
  })

  it.each([
    'http://127.0.0.1:18000/api',
    'http://127.0.0.1:18000?debug=true',
    'http://127.0.0.1:18000#fragment',
    'http://user:password@127.0.0.1:18000',
  ])('拒绝包含路径或凭据的地址：%s', (raw) => {
    expect(() => resolveApiBaseUrl(raw)).toThrow('VITE_GO_API_BASE_URL 必须是 Origin')
  })
})
