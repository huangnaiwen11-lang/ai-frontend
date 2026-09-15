import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import './template-preview.css'

interface TemplateSheetProps {
  title: string
  open?: boolean
  closeLabel?: string
  onClose: () => void
  children: ReactNode
}

/**
 * 模板预览和创作共用模态生命周期，不承载上传、门禁或生成业务。
 * 关闭时不卸载子表单，保留浏览器的文件选择；页面离开时由页面业务取消未完成提交。
 */
export function TemplateSheet({ title, open = true, closeLabel = '关闭预览', onClose, children }: TemplateSheetProps) {
  const titleID = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const backdropPress = useRef(false)

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current!
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open])

  return createPortal(
    <dialog ref={dialogRef} className="template-preview" aria-labelledby={titleID} aria-modal="true"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onPointerDown={(event) => { backdropPress.current = event.target === event.currentTarget }}
      onClick={(event) => {
        // 从图片内开始拖动、在遮罩松手不能误关弹层。
        if (backdropPress.current && event.target === event.currentTarget) onClose()
        backdropPress.current = false
      }}>
      <section className="template-preview__sheet">
        <div className="template-preview__handle" aria-hidden="true" />
        <header className="template-preview__header">
          <h2 id={titleID}>{title}</h2>
          <button ref={closeRef} type="button" className="template-preview__close" title={closeLabel} aria-label={closeLabel} onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </dialog>, document.body,
  )
}
