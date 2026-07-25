import { Hono } from 'hono'

const app = new Hono()

app.post('/', async (c) => {
  try {
    const { url, headers, method = 'POST', body: requestBody } = await c.req.json()

    if (!url) {
      return c.json({ error: '缺少 url 参数' }, 400)
    }

    console.log(`[PROXY] ${method} ${url}`)

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }

    if (requestBody) {
      fetchOptions.body = requestBody
    }

    const response = await fetch(url, fetchOptions)
    const data = await response.text()

    let parsed: unknown = data
    try {
      parsed = JSON.parse(data)
    } catch {
      // keep as text
    }

    return c.json({
      status: response.status,
      data: parsed,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '未知错误'
    return c.json({ error: `代理请求失败: ${message}` }, 502)
  }
})

export default app
