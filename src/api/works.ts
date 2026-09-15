import type { GoApiClient } from './http'

/** Go 作品聚合接口仅暴露的媒体类型。 */
export type WorkKind = 'image' | 'video'

/**
 * 作品是 Go 按当前会话用户投影的结果，前端只能消费这组白名单字段。
 * 不在此模型中加入用户、生成中台任务、模型配方或支付信息，避免泄漏和语义漂移。
 */
export type WorkItem = {
  id: string
  kind: WorkKind
  status: string
  templateId?: string
  /** 模板发布版本由 Go 的 int64 投影为 JSON number，前端只展示，不参与比较或计算。 */
  templateVersion?: number
  durationSeconds?: number
  createdAt: string
  updatedAt: string
  resultUrl?: string
  error?: string
}

export type WorksPage = {
  items: WorkItem[]
  nextCursor: string | null
}

export type ListWorksInput = {
  limit: number
  kind?: WorkKind
  cursor?: string
}

/**
 * 作品读取的唯一前端 API 边界。
 * 身份由 GoApiClient 附带的自有会话决定，列表与详情均禁止接收 userId。
 */
export class WorksApi {
  public constructor(private readonly client: GoApiClient) {}

  public list(input: ListWorksInput): Promise<WorksPage> {
    return this.client.get('/api/works', {
      limit: input.limit,
      kind: input.kind,
      // 仅回传 Go 生成的不透明游标，绝不混用 skip、offset 等旧式分页参数。
      cursor: input.cursor,
    })
  }

  public get(workId: string): Promise<WorkItem> {
    return this.client.get(`/api/works/${encodeURIComponent(workId)}`)
  }
}
