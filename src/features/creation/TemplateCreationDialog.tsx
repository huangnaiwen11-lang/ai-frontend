import { type FormEventHandler, type ReactNode } from 'react'
import { TemplateSheet } from '../templates/TemplateSheet'
import { TemplateMedia } from '../templates/TemplateMedia'
import type { TemplatePresentation } from '../../api/media'
import './template-creation.css'

interface TemplateCreationDialogProps extends TemplatePresentation {
  title: string
  open: boolean
  disabled: boolean
  status: ReactNode
  onClose: () => void
  onSubmit: FormEventHandler<HTMLFormElement>
  children: ReactNode
}

/**
 * 将页面的单份创作表单放入详情弹层。输入和请求状态归页面所有，
 * 这里仅组织封面、可滚动表单和固定提交区，不重新构造生成请求。
 */
export function TemplateCreationDialog({ title, open, disabled, status, onClose, onSubmit, children, ...media }: TemplateCreationDialogProps) {
  return <TemplateSheet title={title} open={open} closeLabel="关闭创作" onClose={onClose}>
    <form className="template-creation__form" onSubmit={onSubmit}>
      <div className="template-creation__scroll">
        {open ? <div className="template-creation__cover"><TemplateMedia title={title} {...media} /></div> : null}
        <div className="template-creation__fields">{children}</div>
        {open ? status : null}
      </div>
      <footer className="template-preview__footer">
        <button type="submit" disabled={disabled}>开始生成</button>
      </footer>
    </form>
  </TemplateSheet>
}
