/// <reference types="node" />

// @vitest-environment node

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  PUBLIC_CONTENT,
  resolvePublicLocale,
} from './public-content'
import type { PublicDocument, PublicLocale } from './public-content'

function serializeDocument(document: PublicDocument) {
  return [
    document.title,
    document.lastUpdated,
    document.intro ?? '',
    document.feedbackHint ?? '',
    document.sections.map((section) => [section.title, section.content]),
  ]
}

function serializeLocale(locale: PublicLocale) {
  const content = PUBLIC_CONTENT[locale]

  return JSON.stringify([
    [
      content.faq.title,
      content.faq.subtitle,
      content.faq.items.map((item) => [item.question, item.answer]),
    ],
    serializeDocument(content.privacy),
    serializeDocument(content.terms),
    serializeDocument(content.contentPolicy),
  ])
}

function contentSha256(locale: PublicLocale) {
  return createHash('sha256').update(serializeLocale(locale), 'utf8').digest('hex')
}

const FULL_TEXT_SHA256: Readonly<Record<PublicLocale, string>> = {
  zh: 'c5339b5bd6acdbc1b252f613fc19618e6a74b709f286c5296b59456e6ef2972f',
  en: 'f363ee077b55d637305f8dbbcdaf77712e8a3d5e00a8afd2b8228c1ae6200a68',
}

describe('公共页原文内容契约', () => {
  it('提供中文和英文的 FAQ、隐私政策、服务条款与内容政策', () => {
    expect(Object.keys(PUBLIC_CONTENT.zh)).toEqual([
      'faq',
      'privacy',
      'terms',
      'contentPolicy',
    ])
    expect(Object.keys(PUBLIC_CONTENT.en)).toEqual([
      'faq',
      'privacy',
      'terms',
      'contentPolicy',
    ])
  })

  it('保留旧站法律文件的日期和联系邮箱', () => {
    for (const locale of ['zh', 'en'] as const) {
      expect(PUBLIC_CONTENT[locale].privacy.lastUpdated).toContain('2024')
      expect(PUBLIC_CONTENT[locale].terms.lastUpdated).toContain('2024')
      expect(PUBLIC_CONTENT[locale].privacy.sections.at(-1)?.content).toContain(
        'privacy@cling-ai.com',
      )
      expect(PUBLIC_CONTENT[locale].terms.sections.at(-1)?.content).toContain(
        'legal@cling-ai.com',
      )
      expect(PUBLIC_CONTENT[locale].contentPolicy.lastUpdated).toContain('2026')
    }
  })

  it('保留 FAQ 的首个问题和完整问答数组', () => {
    expect(PUBLIC_CONTENT.zh.faq.items).toHaveLength(8)
    expect(PUBLIC_CONTENT.zh.faq.items[0]).toEqual({
      question: '如何创建 AI 图像或视频？',
      answer:
        '打开“创建”，选择“图像”或“视频”，根据需要上传照片，编写提示，然后点击“生成”。生成完成后，您的结果将保存到配置文件中。',
    })
    expect(PUBLIC_CONTENT.en.faq.items).toHaveLength(8)
    expect(PUBLIC_CONTENT.en.faq.items[0]).toEqual({
      question: 'What is Cling AI?',
      answer:
        'Cling AI is an AI creation platform where you can create AI images and videos, transform photos into videos, swap faces, and explore ready-to-use creative tools.',
    })
  })

  it.each(['zh', 'en'] as const)('逐字保留 %s 公共页全文', (locale) => {
    expect(contentSha256(locale)).toBe(FULL_TEXT_SHA256[locale])
  })

  it('在编译期防止改写嵌套原文', () => {
    if (false) {
      // @ts-expect-error 公共 FAQ 原文必须深度只读
      PUBLIC_CONTENT.zh.faq.items[0].question = '改写后的问题'
      // @ts-expect-error 公共文档原文必须深度只读
      PUBLIC_CONTENT.en.privacy.sections[0].content = 'Rewritten content'
    }

    expect(true).toBe(true)
  })

  it('仅将 zh 前缀解析为中文，其余语言回退英文', () => {
    expect(resolvePublicLocale('zh')).toBe('zh')
    expect(resolvePublicLocale('zh-CN')).toBe('zh')
    expect(resolvePublicLocale('ZH-Hans')).toBe('zh')
    expect(resolvePublicLocale('en-US')).toBe('en')
    expect(resolvePublicLocale('ja')).toBe('en')
    expect(resolvePublicLocale()).toBe('en')
  })

  it('内容模块不依赖旧项目、远程 URL 或 API', () => {
    const source = readFileSync(new URL('./public-content.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(/ai-host-v2-platform-main/i)
    expect(source).not.toMatch(/from\s+['\"][^'\"]*(?:old|legacy)[^'\"]*['\"]/i)
    expect(source).not.toMatch(/https?:\/\//i)
    expect(source).not.toMatch(/\/api(?:\/|$)/i)
  })
})
