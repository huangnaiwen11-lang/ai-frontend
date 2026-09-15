import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'

const container = document.getElementById('root')

if (!container) {
  throw new Error('未找到应用挂载节点')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 仅注册静态壳的 service worker；不缓存 Go API，避免离线数据伪装成实时业务状态。
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'))
}
