import type { GoApiClient } from './http'
import { createGoApiError } from './errors'

/** 公开展示字段白名单；技术配方与结算事实不能混入目录投影。 */
export type TemplatePresentation = {
  coverUrl?: string
  videoUrl?: string
  previewVideoUrl?: string
  tag?: string
  badge?: 'new' | 'trending' | 'hot'
}

export type ImageTemplate = TemplatePresentation & {
  id: string
  title: string
  type: 'image'
  contentRating: 'sfw' | 'nsfw'
}

export type UploadedImage = {
  id: string
  reference: string
  contentType: string
  sizeBytes: number
  downloadUrl: string
}

export type VideoTemplate = TemplatePresentation & {
  id: string
  title: string
  type: 'video'
  contentRating: 'sfw' | 'nsfw'
}

/**
 * 媒体 API 只面向 Go 自有素材域。模板配方、模型和对象存储细节均不进入前端协议。
 */
export class MediaApi {
  public constructor(private readonly client: GoApiClient) {}

  public listImageTemplates(): Promise<{ items: ImageTemplate[]; total: number }> {
    return this.client.get<unknown>('/api/homepage/image-templates').then((value) => normalizeTemplates<ImageTemplate>(value, 'image'))
  }

  public listVideoTemplates(): Promise<{ items: VideoTemplate[]; total: number }> {
    return this.client.get<unknown>('/api/homepage/video-templates').then((value) => normalizeTemplates<VideoTemplate>(value, 'video'))
  }

  public uploadImage(file: File): Promise<UploadedImage> {
    // 先做轻量边界校验，减少无效上传；服务端仍会按字节重新检测类型，不能把前端校验当作安全边界。
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    if (file.type && !allowedTypes.has(file.type)) {
      return Promise.reject(createGoApiError(400, 'INVALID_IMAGE', '仅支持 JPG、PNG、WebP 或 GIF 图片'))
    }
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      return Promise.reject(createGoApiError(400, file.size === 0 ? 'INVALID_IMAGE' : 'IMAGE_TOO_LARGE', file.size === 0 ? '图片文件无效' : '图片文件超过大小限制'))
    }
    const form = new FormData()
    form.append('file', file, file.name)
    return this.client.postForm<unknown>('/api/media/images', form).then(normalizeUploadedImage)
  }
}

function normalizeTemplates<T extends ImageTemplate | VideoTemplate>(value: unknown, kind: 'image' | 'video'): { items: T[]; total: number } {
  if (!isRecord(value) || !Array.isArray(value.items) || !Number.isInteger(value.total) || (value.total as number) < 0 || (value.total as number) !== value.items.length) return invalidResponse()
  const seen = new Set<string>()
  const items = value.items.map((raw) => {
    if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id.trim() || typeof raw.title !== 'string' || !raw.title.trim() || raw.type !== kind || (raw.contentRating !== 'sfw' && raw.contentRating !== 'nsfw') || (raw.coverUrl !== undefined && typeof raw.coverUrl !== 'string') || seen.has(raw.id)) return invalidResponse()
    seen.add(raw.id)
    const presentation: TemplatePresentation = {}
    for (const field of ['coverUrl', 'videoUrl', 'previewVideoUrl', 'tag'] as const) {
      if (raw[field] === undefined) continue
      if (typeof raw[field] !== 'string') return invalidResponse()
      presentation[field] = raw[field]
    }
    if (raw.badge !== undefined) {
      if (raw.badge !== 'new' && raw.badge !== 'trending' && raw.badge !== 'hot') return invalidResponse()
      presentation.badge = raw.badge
    }
    return { id: raw.id, title: raw.title, type: kind, contentRating: raw.contentRating, ...presentation }
  })
  return { items: items as T[], total: value.total as number }
}

function normalizeUploadedImage(value: unknown): UploadedImage {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim() || value.id.includes('/') || typeof value.reference !== 'string' || !isSafeHttpsReference(value.reference) || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(String(value.contentType)) || typeof value.sizeBytes !== 'number' || !Number.isInteger(value.sizeBytes) || value.sizeBytes <= 0 || value.sizeBytes > 10 * 1024 * 1024 || value.downloadUrl !== `/api/media/images/${value.id}`) throw createGoApiError(503, 'INVALID_API_RESPONSE', 'Go API 返回了无效的素材响应')
  return { id: value.id, reference: value.reference, contentType: value.contentType as string, sizeBytes: value.sizeBytes, downloadUrl: value.downloadUrl }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function invalidResponse(): never { throw createGoApiError(503, 'INVALID_API_RESPONSE', 'Go API 返回了无效的素材响应') }
function isSafeHttpsReference(value: string): boolean {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.hash && !url.search && url.pathname.split('/').filter(Boolean).length >= 2 }
  catch { return false }
}
