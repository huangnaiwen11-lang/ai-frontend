import { useEffect, useRef, useState } from 'react'
import type { GoApiError } from '../../api/errors'
import { isGoApiError } from '../../api/http'

type SubmissionState = { isSubmitting: boolean; error: GoApiError | Error | null }

/**
 * 统一管理创建请求的生命周期。请求键在浏览器端先锁住，避免双击在 Go 预扣前形成两笔独立请求；
 * 卸载后异步上传即使完成，也不能继续创建任务。
 */
export function useCreationSubmission() {
  const activeRef = useRef(true)
  const runningRef = useRef(false)
  const sequenceRef = useRef(0)
  const [state, setState] = useState<SubmissionState>({ isSubmitting: false, error: null })

  useEffect(() => {
    // StrictMode 会先执行一次清理再重新挂载；重新挂载必须恢复活动标记，否则开发环境会误禁用提交。
    activeRef.current = true
    return () => {
      activeRef.current = false
      sequenceRef.current += 1
      runningRef.current = false
    }
  }, [])

  async function submit<T>(operation: (isCurrent: () => boolean) => Promise<T>, onSuccess: (value: T) => void): Promise<void> {
    if (runningRef.current || !activeRef.current) return
    runningRef.current = true
    const sequence = ++sequenceRef.current
    setState({ isSubmitting: true, error: null })
    try {
      const result = await operation(() => activeRef.current && sequenceRef.current === sequence)
      if (activeRef.current && sequenceRef.current === sequence) onSuccess(result)
    } catch (caught) {
      if (activeRef.current && sequenceRef.current === sequence) {
        setState({ isSubmitting: false, error: isGoApiError(caught) ? caught : new Error('创建请求未完成') })
      }
      runningRef.current = false
      return
    }
    if (activeRef.current && sequenceRef.current === sequence) setState({ isSubmitting: false, error: null })
    runningRef.current = false
  }

  return { ...state, submit, clearError: () => setState((current) => ({ ...current, error: null })) }
}
