import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import {readPublicConfig} from './src/lib/config-values.js';

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  if (command === 'build') {
    const {errors}=readPublicConfig(env);
    if(errors.length) throw new Error(`Invalid public configuration:\n${errors.join('\n')}`);
  }

  return {
    // ============================================================
    // LOGGING
    // ============================================================
    logLevel: 'error', // Suppress warnings, only show errors

    // ============================================================
    // PLUGINS
    // ============================================================
    plugins: [
      react(), // ✅ React Fast Refresh
      // ✅ REMOVED: @base44/vite-plugin (migrated to Supabase)
    ],

    // ============================================================
    // RESOLVE ALIASES (for @/ imports)
    // ============================================================
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    // ============================================================
    // SERVER
    // ============================================================
    server: {
      port: env.APP_PORT ? Number(env.APP_PORT) : 5173,
      host: env.APP_HOST || 'localhost',
      open: env.APP_OPEN !== 'false',
    },

    // ============================================================
    // BUILD
    // ============================================================
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'esbuild' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor chunks for better caching
            vendor: [
              'react',
              'react-dom',
              'react-router-dom',
            ],
            ui: [
              '@radix-ui/react-accordion',
              '@radix-ui/react-dialog',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
            ],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },

    // ============================================================
    // ENVIRONMENT VARIABLES (for application code)
    // ============================================================
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV || mode),
    },

    // ============================================================
    // OPTIMIZATION
    // ============================================================
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        'pdfjs-dist',
      ],
    },

    // ============================================================
    // CSS
    // ============================================================
    css: {
      devSourcemap: mode === 'development',
    },

    // ============================================================
    // PREVIEW
    // ============================================================
    preview: {
      port: 4173,
      host: 'localhost',
    },
  };
});
