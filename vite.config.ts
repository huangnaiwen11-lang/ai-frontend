import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    // 受限本地环境可将缓存移到可写临时目录；默认仍使用 Vite 的项目缓存目录。
    cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
    // 本地 Go Gateway 未开放跨域时，由本项目开发服务器同源转发；目标仍然只有 Go。
    server: {
      host: '127.0.0.1',
      port: 5174,
      strictPort: true,
      proxy: {
        '/api': {
          target: environment.VITE_GO_GATEWAY_TARGET || 'http://127.0.0.1:18000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      globals: true,
      // 浏览器测试只在 src 内发现；scripts 使用 Node 原生测试运行器单独执行。
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
})
