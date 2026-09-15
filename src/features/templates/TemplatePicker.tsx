import { useId, useState } from 'react'
import './template-picker.css'

type TemplateChoice = { id: string; title: string; coverUrl?: string }
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
          <label className="template-picker__card" key={item.id}>
            <input type="radio" name={groupName} value={item.id} checked={value === item.id}
              disabled={disabled || loading} aria-label={item.title} onChange={() => onChange(item.id)} />
            <TemplateCover key={`${item.id}:${item.coverUrl ?? ''}`} item={item} />
            <span className="template-picker__title">{item.title}</span>
          </label>
        ))}
      </div>
    </section>
  )
}

function TemplateCover({ item }: { item: TemplateChoice }) {
  const [failed, setFailed] = useState(false)
  // 上一轮把公共文件迁入 legacy，但本地 Go 测试目录仍使用旧站根路径。
  // 这里只修正已核实的同一文件地址；绝不改写任意 CDN URL 或用图标替代模板封面。
  const url = item.coverUrl === '/cling-ai-icon.png' ? '/legacy/cling-ai-icon.png' : item.coverUrl
  if (!url || failed) return <span className="template-picker__missing">暂无封面</span>
  return <img src={url} alt={item.title} loading="lazy" decoding="async" onError={() => setFailed(true)} />
}
