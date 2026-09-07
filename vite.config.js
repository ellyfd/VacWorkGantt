import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true'
    }),
    react(),
  ],
  // 注意：不要加 rollupOptions.output.manualChunks 做 vendor 切分——
  // recharts/d3 等套件切開後會產生 chunk 間循環引用，正式建置
  // 在模組初始化時拋出「Cannot access 'X' before initialization」
  // 導致整個 app 白屏（dev 模式不走 manualChunks，本機測不出來）。
});