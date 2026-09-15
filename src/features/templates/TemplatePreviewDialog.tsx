import { TemplateSheet } from './TemplateSheet'
import { TemplateMedia } from './TemplateMedia'
import type { TemplatePresentation } from '../../api/media'

interface TemplatePreviewDialogProps extends TemplatePresentation {
  title: string
  onClose: () => void
  onSelect: () => void
}

/** 只展示当前模板的封面或示例；确认选择交回页面，不上传或生成。 */
export function TemplatePreviewDialog({ title, onClose, onSelect, ...media }: TemplatePreviewDialogProps) {
  return <TemplateSheet title={title} onClose={onClose}>
        <div className="template-preview__media">
          <TemplateMedia title={title} {...media} />
        </div>
        <footer className="template-preview__footer">
          <button type="button" onClick={onSelect}>使用模板</button>
        </footer>
  </TemplateSheet>
}
