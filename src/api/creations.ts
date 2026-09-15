import type { GoApiClient } from './http'

export type CreateImageInput = {
  prompt: string
  negativePrompt?: string
  aspectRatio?: string
}

export type CreateTemplateImageEditInput = {
  templateId: string
  inputImages: string[]
  prompt?: string
  aspectRatio?: string
}

export type CreateVideoInput = {
  templateId: string
  imageUrl?: string
  prompt?: string
  durationSeconds?: 5 | 10 | 15
}

export type ImageCreationResult = {
  imageId: string
  jobId?: string
  status: string
}

export type ImageStatus = {
  id: string
  imageUrl?: string
  generationStatus: string
  generationErrorCode?: string
  generationErrorMessage?: string
}

export type VideoCreationResult = {
  taskId: string
  status: string
  durationSeconds: number
}

export type VideoStatus = {
  taskId: string
  status: string
  videoUrl?: string
  durationSeconds?: number
  generationErrorCode?: string
  failedMessage?: string
}

/**
 * 创作协议只保留用户可表达的产品输入。
 * 余额、钻石、VIP、模型和回调地址均是服务端事实，前端不得传入或推断。
 */
export class CreationApi {
  public constructor(private readonly client: GoApiClient) {}

  public createImage(input: CreateImageInput): Promise<ImageCreationResult> {
    return this.client.post('/api/chat/image/async', { ...input, operation: 'generate' })
  }

  public createTemplateImageEdit(input: CreateTemplateImageEditInput): Promise<ImageCreationResult> {
    return this.client.post('/api/chat/image/async', {
      ...input,
      presetTags: [input.templateId],
      operation: 'generate',
    })
  }

  public getImage(imageId: string): Promise<{ image: ImageStatus }> {
    return this.client.get(`/api/images/${imageId}`)
  }

  public listImageStatuses(imageIds: string[]): Promise<{ statuses: ImageStatus[] }> {
    return this.client.post('/api/images/statuses', { imageIds })
  }

  public createVideo(input: CreateVideoInput): Promise<VideoCreationResult> {
    return this.client.post('/api/chat/video', input)
  }

  public getVideo(taskId: string): Promise<VideoStatus> {
    return this.client.get(`/api/chat/video/${taskId}`)
  }

  public listVideoStatuses(taskIds: string[]): Promise<{ statuses: VideoStatus[] }> {
    return this.client.post('/api/chat/videos/status', { taskIds })
  }
}
