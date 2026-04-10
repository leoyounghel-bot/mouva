import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

import path from 'path';

// Custom plugin to fix broken @opentelemetry/api ESM imports
function opentelemetryFixPlugin(): Plugin {
  return {
    name: 'opentelemetry-fix',
    resolveId(source, importer) {
      // Fix broken internal imports in @opentelemetry/api
      if (importer?.includes('@opentelemetry') && source.includes('internal/')) {
        return { id: 'virtual:opentelemetry-stub', moduleSideEffects: false };
      }
      return null;
    },
    load(id) {
      if (id === 'virtual:opentelemetry-stub') {
        // Provide all exports that @opentelemetry/api internal modules need
        return `
          export default {};
          export const getGlobal = () => globalThis;
          export const registerGlobal = () => true;
          export const unregisterGlobal = () => {};
          export const _INTERNAL_WINDOW_UTILS = {};
          export const GLOBAL_OPENTELEMETRY_API_KEY = Symbol.for('opentelemetry.js.api.0');
          export const VERSION = '1.7.0';
        `;
      }
      return null;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const envCurrent = loadEnv(mode, process.cwd(), '');
  // Load env file from the parent directory (monorepo root)
  const envRoot = loadEnv(mode, path.resolve(process.cwd(), '..'), '');

  // Merge env vars, current directory takes precedence
  const env = { ...envRoot, ...envCurrent };

  return {
    server: {
      proxy: {
        '/api/xai': {
          target: 'https://api.x.ai/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/xai/, ''),
        },
        '/api/together': {
          target: 'https://api.together.xyz',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/together/, ''),
        },
        // Backend API proxy
        '/api/auth': {
          target: 'http://localhost:5800',
          changeOrigin: true,
        },
        '/api/sessions': {
          target: 'http://localhost:5800',
          changeOrigin: true,
        },
        '/api/health': {
          target: 'http://localhost:5800',
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        // Fix: lucide package.json has no exports field, causing Vite commonjs resolver to fail
        'lucide': path.resolve(__dirname, 'node_modules/lucide/dist/esm/lucide.js'),
      },
    },
    build: {
      target: 'esnext',
      sourcemap: true,
    },
    plugins: [
      opentelemetryFixPlugin(),
      react(),
      sentryVitePlugin({
        org: "hand-dot",
        project: "playground-pdfme"
      }),
    ],
    // Fix for potential missing node globals in browser when using src
    define: {
      'process.env.TOGETHER_API_KEY': JSON.stringify(env.TOGETHER_API_KEY),
      // Azure Document Intelligence for OCR
      'process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT': JSON.stringify(env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT),
      'process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY': JSON.stringify(env.AZURE_DOCUMENT_INTELLIGENCE_KEY),
      'global': 'window', // Polyfill global for some packages if needed
    },
  };
});