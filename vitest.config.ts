import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// 仅供 vitest 使用；HBuilderX 不读取这个文件
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    include: ['lib/**/*.test.ts'],
  },
})
