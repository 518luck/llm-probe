import adapter from '@hono/vite-dev-server/node'
import honox from 'honox/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    honox({
      devServer: { adapter },
    }),
  ],
})
