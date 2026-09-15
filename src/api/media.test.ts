import { describe, expect, it, vi } from 'vitest'
import { MediaApi } from './media'
import { isGoApiError } from './http'

const client = () => ({ get: vi.fn(), postForm: vi.fn() }) as any
const file = (type: string, size: number, name = 'x.bin') => new File([new Uint8Array(size)], name, { type })

describe('MediaApi', () => {
  it('视频目录保留封面但不透出模型配方', async () => {
    const c = client()
    c.get.mockResolvedValue({ items: [{ id: 'video-1', title: '城市漫步', type: 'video', contentRating: 'sfw', coverUrl: '/cover.jpg', recipe: 'private' }], total: 1 })
    await expect(new MediaApi(c).listVideoTemplates()).resolves.toEqual({ items: [{ id: 'video-1', title: '城市漫步', type: 'video', contentRating: 'sfw', coverUrl: '/cover.jpg' }], total: 1 })
  })

  it('拒绝视频目录中非字符串的封面字段', async () => {
    const c = client()
    c.get.mockResolvedValue({ items: [{ id: 'video-1', title: '城市漫步', type: 'video', contentRating: 'sfw', coverUrl: 42 }], total: 1 })
    await expect(new MediaApi(c).listVideoTemplates()).rejects.toMatchObject({ code: 'INVALID_API_RESPONSE' })
  })

  it('拒绝包含 malformed 项的模板响应，避免把坏目录静默当成可用目录', async () => {
    const c = client()
    c.get.mockResolvedValue({ items: [
      { id: 'img-1', title: 'Portrait', coverUrl: '/cover.jpg', type: 'image', contentRating: 'sfw', recipe: 'secret' },
      { id: 'bad-kind', title: 'x', type: 'video', contentRating: 'sfw' },
      { id: 'bad-rating', title: 'x', type: 'image', contentRating: 'adult' },
    ], total: 3 })
    await expect(new MediaApi(c).listImageTemplates()).rejects.toMatchObject({ code: 'INVALID_API_RESPONSE', status: 503 })
  })

  it('合法空模板响应返回空清单', async () => {
    const c = client(); c.get.mockResolvedValue({ items: [], total: 0 })
    await expect(new MediaApi(c).listVideoTemplates()).resolves.toEqual({ items: [], total: 0 })
  })

  it('malformed 顶层响应返回合同错误', async () => {
    const c = client(); c.get.mockResolvedValue({ items: null, total: '3', recipe: 'secret' })
    await expect(new MediaApi(c).listVideoTemplates()).rejects.toMatchObject({ name: 'GoApiError', status: 503, code: 'INVALID_API_RESPONSE' })
  })

  it('校验上传响应字段形状并拒绝技术字段', async () => {
    const c = client(); c.postForm.mockResolvedValue({ id: 'i1', reference: 'https://uploads.example.test/assets/i1', contentType: 'image/png', sizeBytes: 3, downloadUrl: '/api/media/images/i1', recipe: 'secret' })
    await expect(new MediaApi(c).uploadImage(file('image/png', 3))).resolves.toEqual({ id: 'i1', reference: 'https://uploads.example.test/assets/i1', contentType: 'image/png', sizeBytes: 3, downloadUrl: '/api/media/images/i1' })
  })

  it.each([
    ['empty', file('image/png', 0)],
    ['too large', file('image/png', 10 * 1024 * 1024 + 1)],
    ['unsupported explicit MIME', file('image/gif', 3)],
  ])('rejects %s upload with typed GoApiError', async (_label, value) => {
    await expect(new MediaApi(client()).uploadImage(value)).rejects.toSatisfy((error: unknown) => isGoApiError(error) && error.status === 400)
  })

  it('允许浏览器 MIME 为空并交给 Go 按字节检查', async () => {
    const c = client(); c.postForm.mockResolvedValue({ id: 'i1', reference: 'https://uploads.example.test/assets/i1', contentType: 'image/jpeg', sizeBytes: 3, downloadUrl: '/api/media/images/i1' })
    await new MediaApi(c).uploadImage(file('', 3, 'photo.jpg'))
    expect(c.postForm).toHaveBeenCalled()
  })

  it('允许恰好 10 MiB', async () => {
    const c = client(); c.postForm.mockResolvedValue({ id: 'i1', reference: 'https://uploads.example.test/assets/i1', contentType: 'image/png', sizeBytes: 10 * 1024 * 1024, downloadUrl: '/api/media/images/i1' })
    await expect(new MediaApi(c).uploadImage(file('image/png', 10 * 1024 * 1024))).resolves.toMatchObject({ id: 'i1' })
  })
})
