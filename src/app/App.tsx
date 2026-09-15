import { Component, type ErrorInfo, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './router'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  hasError: boolean
}

/**
 * 顶层边界只兜住渲染异常，避免某个页面故障导致白屏；
 * 接口业务错误仍由 API 层映射并在对应页面展示，不能被这里吞掉。
 */
class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = { hasError: false }

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  public componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // 预留给后续自有可观测性模块；当前阶段不接入旧项目的分析 SDK。
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return <main role="alert">页面发生异常，请刷新后重试。</main>
    }

    return this.props.children
  }
}

export function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppErrorBoundary>
  )
}
