import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Hono } from 'hono'

const app = new Hono()

const CACHE_FILE = join(process.cwd(), 'app/data/api-cache.json')

interface CacheData {
  urls: string[]
  models: Record<string, Array<{ id: string; supported_endpoint_types?: string[] }>>
  lastUrl: string
}

function readCache(): CacheData {
  try {
    if (existsSync(CACHE_FILE)) {
      const data = readFileSync(CACHE_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch {
    // ignore
  }
  return { urls: [], models: {}, lastUrl: '' }
}

function writeCache(data: CacheData) {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // ignore
  }
}

// 获取缓存
app.get('/', (c) => {
  const cache = readCache()
  return c.json(cache)
})

// 保存缓存
app.post('/', async (c) => {
  const body = await c.req.json()
  const cache = readCache()

  // 保存 URL（不存 Key）
  if (body.url) {
    if (!cache.urls.includes(body.url)) {
      cache.urls.push(body.url)
    }
  }
  // 保存模型列表
  if (body.url && body.models !== undefined) {
    cache.models[body.url] = body.models
  }
  // 保存最后使用的 URL
  if (body.lastUrl) {
    cache.lastUrl = body.lastUrl
  }

  writeCache(cache)
  return c.json({ ok: true })
})

export default app
