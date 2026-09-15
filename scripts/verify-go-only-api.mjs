import { readdir, readFile } from 'node:fs/promises'
import { resolve, extname, relative } from 'node:path'
import process from 'node:process'

const projectRoot = resolve(import.meta.dirname, '..')
const targetDirectory = resolve(process.argv[2] || `${projectRoot}/src`)
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs'])

const forbiddenRules = [
  { name: '旧 Node API 地址', pattern: /https?:\/\/(?:api\.)?cling-ai\.com\b/i },
  { name: '旧 Node 上传接口', pattern: /\/api\/upload(?:\/|['"`])/i },
  { name: '旧前端目录导入', pattern: /ai-host-v2-platform-main\/frontend/i },
  { name: '旧钱包客户端', pattern: /\b(?:LegacyWalletClient|NodeWalletClient|legacyWallet)\b/ },
  { name: 'Animate API', pattern: /\b(?:createAnimateTask|animateTaskApi|AnimateApi)\b/ },
]

const violations = []
for (const file of await collectSourceFiles(targetDirectory)) {
  const source = await readFile(file, 'utf8')
  for (const rule of forbiddenRules) {
    if (rule.pattern.test(source)) {
      violations.push({ file: relative(projectRoot, file), rule: rule.name })
    }
  }
}

if (violations.length > 0) {
  console.error('Go-only API audit failed:')
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.rule}`)
  }
  process.exitCode = 1
} else {
  console.log('Go-only API audit passed')
}

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(fullPath)))
      continue
    }
    // 测试中的禁用样例不属于交付代码，避免审计器把自己的测试数据当成违规实现。
    if (sourceExtensions.has(extname(entry.name)) && !/\.(?:test|spec)\.[^.]+$/.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}
