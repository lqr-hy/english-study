import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  console.log('command:', command)
  return {
    base: '/english/',
    plugins: [
      react(),
    ],
  }
})