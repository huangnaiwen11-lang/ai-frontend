import { useEffect, useRef, useState } from 'react'
import type { TemplatePresentation } from '../../api/media'
import { resolveTemplateCover, resolveTemplateVideo } from './template-media'

type TemplateMediaProps = TemplatePresentation & { title: string; active?: boolean }

/** 预览和创作详情共用同一媒体规则；关闭只卸载媒体，不清除页面持有的创作草稿。 */
export function TemplateMedia({ active = true, title, ...media }: TemplateMediaProps) {
  if (!active) return null
  const cover = resolveTemplateCover(media.coverUrl)
  const video = resolveTemplateVideo(media)
  return <MediaContent key={`${cover ?? ''}:${video ?? ''}`} title={title} cover={cover} video={video} />
}

function MediaContent({ title, cover, video }: { title: string; cover?: string; video?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoFailed, setVideoFailed] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  useEffect(() => {
    const element = videoRef.current
    // StrictMode 会先清理再重建 effect，单靠 autoPlay 属性会被清理中的 pause 取消。
    // 自动播放被浏览器拒绝时保留原生控件，不能影响模板选择或触发生成错误。
    void element?.play().catch(() => {})
    // 弹层关闭、目录撤下或源变化时停止旧示例，避免隐藏媒体继续播放。
    return () => element?.pause()
  }, [])
  if (video && !videoFailed) return <video ref={videoRef} src={video} poster={cover}
    aria-label={`${title}示例视频`} muted autoPlay loop controls playsInline preload="metadata"
    onError={() => setVideoFailed(true)} />
  return <>
    {videoFailed ? <p role="status">示例视频加载失败</p> : null}
    {cover && !imageFailed ? <img src={cover} alt={title} onError={() => setImageFailed(true)} />
      : <p role={imageFailed ? 'alert' : undefined}>{imageFailed ? '预览图片加载失败' : videoFailed ? '暂无可用预览' : '暂无封面'}</p>}
  </>
}
