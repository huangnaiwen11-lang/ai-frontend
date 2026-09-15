import { type FormEvent, useMemo, useState } from 'react'
import { CreationApi } from '../../api/creations'
import { useGoApiClient } from '../../app/GoApiProvider'
import { CreationError } from './CreationError'
import { useImageCreationStatus } from './useCreationStatus'
import { useCreationSubmission } from './useCreationSubmission'
import { CreationResult } from './CreationResult'

export function ImageCreationPage() {
  const client = useGoApiClient()
  const creationApi = useMemo(() => new CreationApi(client), [client])
  const [prompt, setPrompt] = useState('')
  const [creationId, setCreationId] = useState<string | null>(null)
  const submission = useCreationSubmission()
  const status = useImageCreationStatus(creationApi, creationId)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // 新请求尚未创建前也必须撤销旧任务观察，避免用户误把旧终态当成新任务结果。
    setCreationId(null)
    await submission.submit(() => creationApi.createImage({ prompt }), (result) => setCreationId(result.imageId))
  }

  return (
    <main>
      <h1>图片创作</h1>
      <form onSubmit={handleSubmit}>
        <p>单张图片 20 钻；VIP 每日免费额度由 Go 服务判定。</p>
        <label>
          提示词
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} required />
        </label>
        <button type="submit" disabled={submission.isSubmitting}>开始生成</button>
      </form>
      {submission.error ? <CreationError error={submission.error} /> : null}
      {status.phase === 'polling' ? <p>正在生成</p> : null}
      {status.phase === 'completed' ? <CreationResult kind="image" url={status.image.imageUrl} /> : null}
      {status.phase === 'moderated' ? <p role="status">内容审核未通过，钻石不予退还。</p> : null}
      {status.phase === 'failed' ? <p role="alert">{status.error.message}</p> : null}
    </main>
  )
}
