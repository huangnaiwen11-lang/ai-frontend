/** 只重映射已确认迁入 legacy 的同一文件，列表与弹层必须使用同一封面。 */
export function resolveTemplateCover(coverUrl?: string): string | undefined {
  const url = resolveTemplateMediaURL(coverUrl)
  if (!url) return undefined
  return url === '/cling-ai-icon.png' ? '/legacy/cling-ai-icon.png' : url
}

/** 只允许站内绝对路径或 HTTPS 资源，不把协议相对路径和可执行地址交给媒体元素。 */
export function resolveTemplateMediaURL(value?: string): string | undefined {
  const url = value?.trim()
  if (!url || /[\\\u0000-\u001f\u007f]/.test(url)) return undefined
  if (url.startsWith('/') && !url.startsWith('//')) return url
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? url : undefined
  } catch { return undefined }
}

export function resolveTemplateVideo(template: { videoUrl?: string; previewVideoUrl?: string }): string | undefined {
  return resolveTemplateMediaURL(template.videoUrl) ?? resolveTemplateMediaURL(template.previewVideoUrl)
}

export function hasTemplateMedia(template: { coverUrl?: string; videoUrl?: string; previewVideoUrl?: string }): boolean {
  return Boolean(resolveTemplateCover(template.coverUrl) || resolveTemplateVideo(template))
}
