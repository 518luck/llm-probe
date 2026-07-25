import type {} from 'hono'

type Data = {
  title?: string
}

declare module 'hono' {
  interface ContextRenderer {
    (content: string | Promise<string>, data?: Data): Response | Promise<Response>
  }
}
