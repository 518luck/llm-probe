import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Hono } from 'hono'

const app = new Hono()

const CACHE_FILE = join(process.cwd(), 'app/data/api-cache.json')

interface CacheData {
  urls: Record<string, string>
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
  return { urls: {}, lastUrl: '' }
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

  if (body.url && body.key !== undefined) {
    cache.urls[body.url] = body.key
  }
  if (body.lastUrl) {
    cache.lastUrl = body.lastUrl
  }

  writeCache(cache)
  return c.json({ ok: true })
})

export default app
