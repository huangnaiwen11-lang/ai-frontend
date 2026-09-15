import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { CreationApi } from '../../api/creations'
import { MediaApi, type VideoTemplate } from '../../api/media'
import { useGoApiClient } from '../../app/GoApiProvider'
import { useVideoCreationStatus } from './useVideoCreationStatus'
import type { GoApiError } from '../../api/errors'
import { useCreationSubmission } from './useCreationSubmission'
import { CreationError } from './CreationError'
import { TemplatePicker } from '../templates/TemplatePicker'
import { CreationImageInput } from './CreationImageInput'
import { CreationResult } from './CreationResult'

const VIDEO_DURATIONS = [5, 10, 15] as const
const VIDEO_PRICES: Record<(typeof VIDEO_DURATIONS)[number], number> = { 5: 50, 10: 100, 15: 150 }

// 视频页只提供模板选择与一张首帧图片。I2V 技术配方和预扣事实始终由 Go 服务端控制。
export function VideoCreationPage() {
  const client = useGoApiClient()
  const creationApi = useMemo(() => new CreationApi(client), [client])
  const mediaApi = useMemo(() => new MediaApi(client), [client])
  const [templates, setTemplates] = useState<VideoTemplate[]>([])
  const [templateID, setTemplateID] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [prompt, setPrompt] = useState('')
  const [durationSeconds, setDurationSeconds] = useState<(typeof VIDEO_DURATIONS)[number]>(5)
  const [taskID, setTaskID] = useState<string | null>(null)
  const [error, setError] = useState<GoApiError | Error | null>(null)
  const [loading, setLoading] = useState(true)
  const submission = useCreationSubmission()
  const status = useVideoCreationStatus(creationApi, taskID)

  useEffect(() => {
    let cancelled = false
    void mediaApi.listVideoTemplates().then((result) => {
      if (!cancelled) setTemplates(result.items)
    }).catch(() => {
      if (!cancelled) setError(new Error('读取视频模板失败'))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [mediaApi])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!templateID || (!file && !prompt.trim())) return
    setTaskID(null)
    setError(null)
    await submission.submit(async (isCurrent) => {
      const input = file
        ? { templateId: templateID, imageUrl: (await mediaApi.uploadImage(file)).reference, durationSeconds }
        : { templateId: templateID, prompt: prompt.trim(), durationSeconds }
      if (!isCurrent()) throw new Error('页面已离开，取消创建')
      return creationApi.createVideo(input)
    }, (result) => setTaskID(result.taskId))
  }

  return <main>
    <h1>视频创作</h1>
    <form onSubmit={handleSubmit}>
      <TemplatePicker label="选择视频模板" items={templates} value={templateID} onChange={setTemplateID}
        loading={loading} disabled={submission.isSubmitting} failed={Boolean(error)} />
      <CreationImageInput label="上传首帧图片（可选）" file={file} onChange={setFile} disabled={submission.isSubmitting} />
      <label>首帧描述（可选）
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} disabled={submission.isSubmitting} />
      </label>
      <label>视频时长
        <select value={durationSeconds} onChange={(event) => setDurationSeconds(Number(event.target.value) as (typeof VIDEO_DURATIONS)[number])} disabled={submission.isSubmitting}>
          {VIDEO_DURATIONS.map((duration) => <option key={duration} value={duration}>{duration} 秒（{VIDEO_PRICES[duration]} 钻）</option>)}
        </select>
      </label>
      <button type="submit" disabled={loading || submission.isSubmitting || !templateID || (!file && !prompt.trim())}>开始生成</button>
    </form>
    {error || submission.error ? <CreationError error={error ?? submission.error!} /> : null}
    {status.phase === 'polling' ? <p>正在生成</p> : null}
    {status.phase === 'completed' ? <CreationResult kind="video" url={status.video.videoUrl} /> : null}
    {status.phase === 'moderated' ? <p role="status">内容审核未通过，钻石不予退还。</p> : null}
    {status.phase === 'failed' ? <p role="alert">{status.message}</p> : null}
  </main>
}
