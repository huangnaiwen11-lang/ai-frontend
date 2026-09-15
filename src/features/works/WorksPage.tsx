import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { type WorkItem, type WorkKind, WorksApi } from '../../api/works'
import { isGoApiError } from '../../api/http'
import { useGoApiClient } from '../../app/GoApiProvider'
import { ROUTES } from '../../app/routes'
import { WorkPresentation } from './WorkPresentation'

const WORKS_PAGE_SIZE = 20

/**
 * 当前 Go 会话用户的作品历史。
 * 筛选和翻页都只向 Go 传递允许的参数，用户归属及权限始终由服务端决定。
 */
export function WorksPage() {
  const client = useGoApiClient()
  const worksApi = useMemo(() => new WorksApi(client), [client])
  const [selectedKind, setSelectedKind] = useState<WorkKind | undefined>()
  const [items, setItems] = useState<WorkItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const requestGenerationRef = useRef(0)

  useEffect(() => {
    let active = true
    const requestGeneration = ++requestGenerationRef.current

    async function loadFirstPage() {
      setIsLoading(true)
      setErrorMessage(null)
      // 切换筛选条件后不能短暂展示上一个筛选结果。
      setItems([])
      setNextCursor(null)
      try {
        const page = await worksApi.list({ limit: WORKS_PAGE_SIZE, kind: selectedKind })
        if (!active || requestGeneration !== requestGenerationRef.current) return
        setItems(page.items)
        setNextCursor(page.nextCursor)
      } catch (error) {
        if (active && requestGeneration === requestGenerationRef.current) {
          setErrorMessage(readWorksError(error, '读取作品列表失败'))
        }
      } finally {
        if (active && requestGeneration === requestGenerationRef.current) setIsLoading(false)
      }
    }

    void loadFirstPage()
    return () => {
      active = false
      // 离开当前筛选或页面后，迟到的结果不能回写为用户正在看的作品。
      if (requestGenerationRef.current === requestGeneration) requestGenerationRef.current += 1
    }
  }, [selectedKind, worksApi])

  function changeKind(kind?: WorkKind) {
    if (kind === selectedKind) return
    // 用户一切换筛选，就立即隐藏旧列表，并让正在返回的旧续页失效。
    requestGenerationRef.current += 1
    setItems([])
    setNextCursor(null)
    setErrorMessage(null)
    setIsLoadingMore(false)
    setSelectedKind(kind)
  }

  /** 续页只回传服务端提供的复合游标；不使用 skip/offset，以免出现重复或漏项。 */
  async function loadMore() {
    if (!nextCursor || isLoadingMore) return
    const requestGeneration = requestGenerationRef.current
    setIsLoadingMore(true)
    setErrorMessage(null)
    try {
      const page = await worksApi.list({ limit: WORKS_PAGE_SIZE, kind: selectedKind, cursor: nextCursor })
      if (requestGeneration !== requestGenerationRef.current) return
      setItems((currentItems) => [...currentItems, ...page.items])
      setNextCursor(page.nextCursor)
    } catch (error) {
      if (requestGeneration === requestGenerationRef.current) {
        setErrorMessage(readWorksError(error, '读取更多作品失败'))
      }
    } finally {
      if (requestGeneration === requestGenerationRef.current) setIsLoadingMore(false)
    }
  }

  return (
    <main>
      <h1>我的作品</h1>
      <WorkKindFilters selectedKind={selectedKind} onChange={changeKind} />
      {isLoading ? <p role="status">正在读取作品…</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      {!isLoading && !errorMessage && items.length === 0 ? <p>暂无作品记录</p> : null}
      {items.length > 0 ? <WorksList items={items} /> : null}
      {nextCursor ? (
        <button type="button" disabled={isLoadingMore} onClick={() => void loadMore()}>
          {isLoadingMore ? '正在加载…' : '加载更多作品'}
        </button>
      ) : null}
    </main>
  )
}

function WorkKindFilters({ selectedKind, onChange }: { selectedKind?: WorkKind; onChange(kind?: WorkKind): void }) {
  return (
    <section aria-label="作品类型筛选">
      <button type="button" aria-pressed={selectedKind === undefined} onClick={() => onChange(undefined)}>全部作品</button>
      <button type="button" aria-pressed={selectedKind === 'image'} onClick={() => onChange('image')}>仅看图片</button>
      <button type="button" aria-pressed={selectedKind === 'video'} onClick={() => onChange('video')}>仅看视频</button>
    </section>
  )
}

function WorksList({ items }: { items: WorkItem[] }) {
  return (
    <section aria-label="作品列表">
      <ul>
        {items.map((work) => (
          <li key={work.id}>
            <WorkPresentation work={work} />
            <Link to={`${ROUTES.works}/${encodeURIComponent(work.id)}`}>查看作品详情</Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function readWorksError(error: unknown, fallback: string): string {
  return isGoApiError(error) ? error.message : fallback
}
