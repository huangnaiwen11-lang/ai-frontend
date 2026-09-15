import { useEffect, useId, useState } from 'react'
import { Eye } from 'lucide-react'
import { TemplatePreviewDialog } from './TemplatePreviewDialog'
import { hasTemplateMedia, resolveTemplateCover } from './template-media'
import type { TemplatePresentation } from '../../api/media'
import './template-picker.css'

type TemplateChoice = TemplatePresentation & { id: string; title: string }
type TemplatePickerProps = {
  label: string
  items: TemplateChoice[]
  value: string
  loading: boolean
  disabled: boolean
  failed?: boolean
  onChange: (id: string) => void
}

/**
 * 沿用旧站 PresetGrid 的封面网格选择方式，不负责目录授权或任务提交。
 * items 必须来自 Go 的可见目录；缺图时明确显示缺图，不能拿其它模板图片冒充。
 */
export function TemplatePicker({ label, items, value, loading, disabled, failed, onChange }: TemplatePickerProps) {
  const groupName = useId()
  const [previewID, setPreviewID] = useState<string | null>(null)
  const preview = !loading && !disabled && !failed ? items.find((item) => item.id === previewID) : undefined
  const previewAvailable = preview ? hasTemplateMedia(preview) : false
  useEffect(() => {
    // 目录或内容权限更新后立即撤下旧预览；恢复目录不应自动重开。
    if (!preview || !previewAvailable) setPreviewID(null)
  }, [preview, previewAvailable])
  return (
    <section className="template-picker" aria-label={`${label}目录`} aria-busy={loading}>
      <label className="template-picker__select">
        {label}
        <select value={value} disabled={disabled || loading} required onChange={(event) => onChange(event.target.value)}>
          <option value="">请选择模板</option>
          {items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      {loading ? <p role="status">正在读取模板</p> : null}
      {!loading && !failed && items.length === 0 ? <p role="status">暂无可用模板</p> : null}
      <div className="template-picker__grid">
        {items.map((item) => (
          <div className="template-picker__card" key={item.id}>
            <label className="template-picker__choice">
              <input type="radio" name={groupName} value={item.id} checked={value === item.id}
                disabled={disabled || loading} aria-label={item.title} onChange={() => onChange(item.id)}
                onClick={() => { if (value === item.id) onChange(item.id) }} />
              <TemplateCover key={`${item.id}:${item.coverUrl ?? ''}`} item={item} />
              <span className="template-picker__title">{item.title}</span>
            </label>
            <button type="button" className="template-picker__preview" aria-label={`预览${item.title}`} title="预览模板"
              disabled={disabled || loading || failed || !hasTemplateMedia(item)} onClick={() => setPreviewID(item.id)}>
              <Eye size={18} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      {preview && previewAvailable ? <TemplatePreviewDialog key={preview.id} title={preview.title} coverUrl={preview.coverUrl}
        videoUrl={preview.videoUrl} previewVideoUrl={preview.previewVideoUrl}
        onClose={() => setPreviewID(null)} onSelect={() => { onChange(preview.id); setPreviewID(null) }} /> : null}
    </section>
  )
}

function TemplateCover({ item }: { item: TemplateChoice }) {
  const [failed, setFailed] = useState(false)
  const url = resolveTemplateCover(item.coverUrl)
  if (!url || failed) return <span className="template-picker__missing">暂无封面</span>
  return <img src={url} alt={item.title} loading="lazy" decoding="async" onError={() => setFailed(true)} />
}
