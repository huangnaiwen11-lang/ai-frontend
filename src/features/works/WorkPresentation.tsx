import type { WorkItem } from '../../api/works'

/**
 * 列表与详情共用的作品事实展示。
 * 组件只渲染 Go 合同中的字段，确保 UI 不会从状态或本地推断生成成功、模型配方等信息。
 */
export function WorkPresentation({ work, showResultLink = true }: { work: WorkItem; showResultLink?: boolean }) {
  return (
    <>
      <p>{getKindLabel(work.kind)} · {work.status}</p>
      <p><time dateTime={work.createdAt}>创建时间：{work.createdAt}</time></p>
      {work.templateId ? <p>模板：{work.templateId}{work.templateVersion ? `（版本 ${work.templateVersion}）` : ''}</p> : null}
      {work.kind === 'video' && work.durationSeconds !== undefined ? <p>时长：{work.durationSeconds} 秒</p> : null}
      {work.error ? <p role="alert">{work.error}</p> : null}
      <WorkResult work={work} />
      {showResultLink && work.resultUrl ? <p><a href={work.resultUrl}>查看结果</a></p> : null}
    </>
  )
}

/** 服务端未回传 resultUrl 时不创建任何预览元素，避免误导用户任务已经成功。 */
function WorkResult({ work }: { work: WorkItem }) {
  if (!work.resultUrl) return null

  return work.kind === 'image' ? (
    <img src={work.resultUrl} alt="作品结果预览" />
  ) : (
    <video controls src={work.resultUrl} aria-label="作品结果预览" />
  )
}

function getKindLabel(kind: WorkItem['kind']): string {
  return kind === 'image' ? '图片' : '视频'
}
