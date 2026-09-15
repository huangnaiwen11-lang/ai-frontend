import { useEffect, useState } from 'react'
import type { CreationApi, VideoStatus } from '../../api/creations'

type VideoStatusState =
  | { phase: 'idle' }
  | { phase: 'polling'; video: VideoStatus }
  | { phase: 'completed'; video: VideoStatus }
  | { phase: 'moderated'; video: VideoStatus }
  | { phase: 'failed'; message: string }

const terminalStatuses = new Set(['completed', 'succeeded', 'failed', 'rejected', 'moderated'])

// 视频轮询仅追踪已经创建的任务，绝不在定时器中重放创建请求或二次预扣。
export function useVideoCreationStatus(api: CreationApi, taskId: string | null): VideoStatusState {
  const [state, setState] = useState<VideoStatusState>({ phase: 'idle' })
  useEffect(() => {
    if (!taskId) { setState({ phase: 'idle' }); return }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0
    const poll = async () => {
      try {
        const video = await api.getVideo(taskId)
        if (cancelled) return
        if (terminalStatuses.has(video.status)) {
          setState(video.status === 'completed' || video.status === 'succeeded'
            ? { phase: 'completed', video }
            : video.status === 'moderated' || video.status === 'rejected'
              ? { phase: 'moderated', video }
              : { phase: 'failed', message: video.failedMessage || '视频生成未完成' })
          return
        }
        setState({ phase: 'polling', video })
        attempts += 1
        timer = setTimeout(() => void poll(), Math.min(1_000 * 2 ** attempts, 10_000))
      } catch {
        if (!cancelled) setState({ phase: 'failed', message: '读取视频状态失败' })
      }
    }
    void poll()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [api, taskId])
  return state
}
