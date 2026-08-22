import { createReadStream, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const devAudioMiddlewarePlugin = (): Plugin => ({
  name: 'quran-dev-audio-middleware',
  configureServer(server) {
    server.middlewares.use('/assets/audio', (request, response, next) => {
      const requestedPath = decodeURIComponent(request.url?.split('?')[0] ?? '')
      const filePath = resolve('assets/audio', `.${requestedPath}`)

      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        next()
        return
      }

      response.statusCode = 200
      response.setHeader('Content-Type', 'audio/mpeg')
      response.setHeader('Content-Length', statSync(filePath).size)
      createReadStream(filePath).pipe(response)
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devAudioMiddlewarePlugin()],
})
