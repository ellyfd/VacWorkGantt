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
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // 只依 node_modules 路徑分組；base44 plugin 的 virtual module id
        // 不含 node_modules，會自然落回預設分組
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'vendor-react';
          if (id.includes('node_modules/@radix-ui/')) return 'vendor-radix';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'vendor-charts';
          if (id.includes('node_modules/@hello-pangea/dnd') || id.includes('node_modules/date-fns')) return 'vendor-dnd-dates';
        },
      },
    },
  },
});