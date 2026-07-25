import type {} from 'hono'

type Data = {
  title?: string
}

declare module 'hono' {
  type ContextRenderer = (
    content: string | Promise<string>,
    data?: Data,
  ) => Response | Promise<Response>
}
