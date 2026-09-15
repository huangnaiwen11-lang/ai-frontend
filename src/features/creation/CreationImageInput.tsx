import { useEffect, useId, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import './creation-media.css'

interface CreationImageInputProps {
  label: string
  file: File | null
  onChange: (file: File | null) => void
  disabled: boolean
  required?: boolean
}

/** 只管理本地选图，不上传、不创建任务；上传时机仍由创作页的提交逻辑控制。 */
export function CreationImageInput({ label, file, onChange, disabled, required }: CreationImageInputProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null)

  useEffect(() => {
    if (!file || typeof URL.createObjectURL !== 'function') return
    const url = URL.createObjectURL(file)
    setPreview({ file, url })
    // 替换图片、移除及离开页面时释放内存；不把 blob 地址发送到 Go。
    return () => URL.revokeObjectURL(url)
  }, [file])

  function removeImage() {
    if (disabled) return
    if (input.current) input.current.value = ''
    onChange(null)
  }

  return <section className="creation-image-input">
    <label htmlFor={id}>{label}</label>
    <div className="creation-image-input__surface">
      <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/webp"
        disabled={disabled} required={required}
        onChange={(event) => {
          const selected = event.target.files?.[0]
          // 关闭文件选择器不撤销已有选择；只有明确移除才清空业务输入。
          if (selected) onChange(selected)
        }} />
      {file ? <>
        {preview?.file === file ? <LocalImagePreview key={preview.url} url={preview.url} /> : null}
        <button type="button" className="creation-image-input__remove" aria-label="移除图片" title="移除图片"
          disabled={disabled} onClick={removeImage}><X size={20} aria-hidden="true" /></button>
      </> : <ImagePlus className="creation-image-input__placeholder" size={32} aria-hidden="true" />}
    </div>
  </section>
}

function LocalImagePreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  return failed
    ? <p role="alert">图片预览失败，请重新选择图片。</p>
    : <img className="creation-image-input__preview" src={url} alt="已选图片预览" onError={() => setFailed(true)} />
}
