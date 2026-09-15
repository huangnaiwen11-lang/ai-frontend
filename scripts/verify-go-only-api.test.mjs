import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const scriptPath = fileURLToPath(new URL('./verify-go-only-api.mjs', import.meta.url))

test('发现旧 Node API 或上传接口时拒绝通过', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'go-only-audit-'))
  try {
    const file = join(directory, 'bad.ts')
    await writeFile(file, "fetch('https://api.cling-ai.com/api/upload/file')")

    const result = spawnSync(process.execPath, [scriptPath, directory], { encoding: 'utf8' })

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /bad\.ts/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('只使用 Go API 相对路径的源文件通过', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'go-only-audit-'))
  try {
    await writeFile(join(directory, 'good.ts'), "client.post('/api/chat/image/async', { prompt: 'cat' })")

    const result = spawnSync(process.execPath, [scriptPath, directory], { encoding: 'utf8' })

    assert.equal(result.status, 0)
    assert.match(result.stdout, /Go-only API audit passed/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
