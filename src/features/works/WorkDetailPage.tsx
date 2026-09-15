import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { type WorkItem, WorksApi } from '../../api/works'
import { isGoApiError } from '../../api/http'
import { useGoApiClient } from '../../app/GoApiProvider'
import { ROUTES } from '../../app/routes'
import { WorkPresentation } from './WorkPresentation'

/** 作品详情以 Go 的 404 作为归属判断依据，前端不会尝试附带用户标识绕过权限检查。 */
export function WorkDetailPage() {
  const { workId } = useParams<{ workId: string }>()
  const client = useGoApiClient()
  const worksApi = useMemo(() => new WorksApi(client), [client])
  const [work, setWork] = useState<WorkItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadDetail() {
      if (!workId) {
        setErrorMessage('作品不存在或无权查看')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setErrorMessage(null)
      setWork(null)
      try {
        const loadedWork = await worksApi.get(workId)
        if (active) setWork(loadedWork)
      } catch (error) {
        if (active) setErrorMessage(readDetailError(error))
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadDetail()
    return () => { active = false }
  }, [workId, worksApi])

  return (
    <main>
      <h1>作品详情</h1>
      {isLoading ? <p role="status">正在读取作品详情…</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      {work ? <section aria-label="作品详情内容"><WorkPresentation work={work} showResultLink={false} /></section> : null}
      <p><Link to={ROUTES.works}>返回我的作品</Link></p>
    </main>
  )
}

function readDetailError(error: unknown): string {
  // 详情越权和不存在由 Go 统一为 404，前端维持同一文案避免泄漏作品归属。
  if (isGoApiError(error) && error.status === 404) return '作品不存在或无权查看'
  return isGoApiError(error) ? error.message : '读取作品详情失败'
}
