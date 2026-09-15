import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { CreationApi } from '../../api/creations'
import type { GoApiError } from '../../api/errors'
import { isGoApiError } from '../../api/http'
import { MediaApi, type ImageTemplate } from '../../api/media'
import { useGoApiClient } from '../../app/GoApiProvider'
import { useImageCreationStatus } from './useCreationStatus'
import { useCreationSubmission } from './useCreationSubmission'
import { CreationError } from './CreationError'
import { TemplatePicker } from '../templates/TemplatePicker'
import { CreationImageInput } from './CreationImageInput'
import { CreationResult } from './CreationResult'
import { TemplateCreationDialog } from './TemplateCreationDialog'

/**
 * 模板图片编辑只呈现 Go 目录返回的展示字段。用户选择模板与个人图片，
 * 技术配方、模型、钻石与回调地址始终由 Go 服务端冻结和决定。
 */
export function TemplateImageEditPage() {
  const client = useGoApiClient()
  const creationApi = useMemo(() => new CreationApi(client), [client])
  const mediaApi = useMemo(() => new MediaApi(client), [client])
  const [templates, setTemplates] = useState<ImageTemplate[]>([])
  const [templateID, setTemplateID] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [prompt, setPrompt] = useState('')
  const [creationID, setCreationID] = useState<string | null>(null)
  const [submittedTemplateID, setSubmittedTemplateID] = useState<string | null>(null)
  const [error, setError] = useState<GoApiError | Error | null>(null)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const submission = useCreationSubmission()
  const status = useImageCreationStatus(creationApi, creationID)

  useEffect(() => {
    let cancelled = false
    void mediaApi.listImageTemplates()
      .then((response) => {
        if (!cancelled) setTemplates(response.items.filter((item) => item.type === 'image'))
      })
      .catch((caught) => {
        if (!cancelled) setError(isGoApiError(caught) ? caught : new Error('读取模板目录失败'))
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTemplates(false)
      })
    return () => { cancelled = true }
  }, [mediaApi])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!templateID || !file) return
    // 任务反馈绑定提交时的模板，后续浏览其它模板不能改变结果归属。
    setSubmittedTemplateID(templateID)
    setCreationID(null)
    setError(null)
    await submission.submit(async (isCurrent) => {
      // 上传结果的 reference 是服务端签发的素材标识；页面绝不自行拼接 URL 或接受外链。
      const uploaded = await mediaApi.uploadImage(file)
      if (!isCurrent()) throw new Error('页面已离开，取消创建')
      return creationApi.createTemplateImageEdit({ templateId: templateID, inputImages: [uploaded.reference], prompt: prompt || undefined })
    }, (result) => setCreationID(result.imageId))
  }

  const selectedTemplate = templates.find((item) => item.id === templateID)
  const feedbackMatchesSelection = !submittedTemplateID || submittedTemplateID === templateID
  const feedback = <>
    {error || submission.error ? <CreationError error={error ?? submission.error!} /> : null}
    {status.phase === 'polling' ? <p>正在生成</p> : null}
    {status.phase === 'completed' ? <CreationResult kind="image" url={status.image.imageUrl} /> : null}
    {status.phase === 'moderated' ? <p role="status">内容审核未通过，钻石不予退还。</p> : null}
    {status.phase === 'failed' ? <p role="alert">{status.error.message}</p> : null}
  </>

  return (
    <main>
      <h1>模板图片编辑</h1>
      <TemplatePicker label="选择模板" items={templates} value={templateID} onChange={(id) => { setTemplateID(id); setSheetOpen(Boolean(id)) }}
        loading={isLoadingTemplates} disabled={submission.isSubmitting} failed={Boolean(error)} />
      {selectedTemplate ? <>
        <button className="template-creation__resume" type="button" onClick={() => setSheetOpen(true)}>继续编辑</button>
        <TemplateCreationDialog title={selectedTemplate.title} coverUrl={selectedTemplate.coverUrl} open={sheetOpen}
          videoUrl={selectedTemplate.videoUrl} previewVideoUrl={selectedTemplate.previewVideoUrl}
          onClose={() => setSheetOpen(false)} onSubmit={handleSubmit} status={feedbackMatchesSelection ? feedback : null}
          disabled={submission.isSubmitting || isLoadingTemplates || !file}>
          <CreationImageInput label="上传人物图片" file={file} onChange={setFile} disabled={submission.isSubmitting} required />
          <label>
            补充描述（可选）
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} disabled={submission.isSubmitting} />
          </label>
        </TemplateCreationDialog>
      </> : null}
      {!sheetOpen || !selectedTemplate || !feedbackMatchesSelection ? feedback : null}
    </main>
  )
}
