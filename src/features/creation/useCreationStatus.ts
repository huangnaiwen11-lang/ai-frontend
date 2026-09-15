import { useEffect, useState } from 'react'
import type { CreationApi, ImageStatus } from '../../api/creations'
import type { GoApiError } from '../../api/errors'
import { isGoApiError } from '../../api/http'

export type CreationStatusState =
  | { phase: 'idle' }
  | { phase: 'polling'; image: ImageStatus }
  | { phase: 'completed'; image: ImageStatus }
  | { phase: 'moderated'; image: ImageStatus }
  | { phase: 'failed'; image?: ImageStatus; error: GoApiError | Error }

const terminalStatuses = new Set(['completed', 'succeeded', 'failed', 'rejected', 'moderated'])

/**
 * 轮询只观察单个已创建任务；它从不创建新任务，因此页面刷新或请求重试不会造成二次预扣。
 */
export function useImageCreationStatus(api: CreationApi, imageId: string | null): CreationStatusState {
  const [state, setState] = useState<CreationStatusState>({ phase: 'idle' })

  useEffect(() => {
    if (!imageId) {
      setState({ phase: 'idle' })
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempt = 0

    const poll = async () => {
      try {
        const { image } = await api.getImage(imageId)
        if (cancelled) return

        if (terminalStatuses.has(image.generationStatus)) {
          setState(
            image.generationStatus === 'completed' || image.generationStatus === 'succeeded'
              ? { phase: 'completed', image }
              : image.generationStatus === 'moderated' || image.generationStatus === 'rejected'
                ? { phase: 'moderated', image }
                : { phase: 'failed', image, error: new Error(image.generationErrorMessage || '生成未完成') },
          )
          return
        }

        setState({ phase: 'polling', image })
        attempt += 1
        timer = setTimeout(() => void poll(), Math.min(1_000 * 2 ** attempt, 10_000))
      } catch (error) {
        if (cancelled) return
        setState({ phase: 'failed', error: isGoApiError(error) ? error : new Error('读取创作状态失败') })
      }
    }

    void poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [api, imageId])

  return state
}
