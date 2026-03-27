import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(a => {
  console.log('command:', a) // 'serve' or 'build'
  return {
    plugins: [
      react(),
    ]
  }
})