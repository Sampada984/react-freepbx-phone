import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  base: '/react-freepbx-phone/',
  server: {
    https: {
      key: fs.readFileSync('./localhost+3-key.pem'),
      cert: fs.readFileSync('./localhost+3.pem'),
    },
    host: true,
    port: 5173
  }
})
