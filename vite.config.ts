import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler') || id.includes('motion')) {
                return 'vendor-framework';
              }
              if (id.includes('recharts') || id.includes('d3') || id.includes('victory')) {
                return 'vendor-charts';
              }
              if (id.includes('xlsx') || id.includes('jspdf')) {
                return 'vendor-export';
              }
              if (id.includes('socket.io-client') || id.includes('engine.io-client')) {
                return 'vendor-socket';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
            }
          },
        },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': {
          target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err: any) => {
              if (['ECONNRESET', 'ECONNABORTED', 'EPIPE', 'ECANCELED', 'ECONNREFUSED'].includes(err?.code)) {
                return;
              }
              console.warn('[Vite Proxy API Warning]', err?.message || err);
            });
          },
        },
        '/socket.io': {
          target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
          changeOrigin: true,
          ws: true,
          configure: (proxy) => {
            const ignoreCodes = ['ECONNRESET', 'ECONNABORTED', 'EPIPE', 'ECANCELED', 'ECONNREFUSED', 'ERR_STREAM_WRITE_AFTER_END'];
            proxy.on('error', (err: any) => {
              if (ignoreCodes.includes(err?.code)) return;
              console.warn('[Vite Proxy WS Warning]', err?.message || err);
            });
            proxy.on('proxyReqWs', (proxyReq: any, _req: any, socket: any) => {
              socket?.on?.('error', (err: any) => {
                if (ignoreCodes.includes(err?.code)) return;
              });
              proxyReq?.on?.('error', (err: any) => {
                if (ignoreCodes.includes(err?.code)) return;
              });
            });
          },
        },
      },
    },
    server: {
      port: 5173,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err: any) => {
              if (['ECONNRESET', 'ECONNABORTED', 'EPIPE', 'ECANCELED', 'ECONNREFUSED'].includes(err?.code)) {
                return;
              }
              console.warn('[Vite Proxy API Warning]', err?.message || err);
            });
          },
        },
        '/socket.io': {
          target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
          changeOrigin: true,
          ws: true,
          configure: (proxy) => {
            const ignoreCodes = ['ECONNRESET', 'ECONNABORTED', 'EPIPE', 'ECANCELED', 'ECONNREFUSED', 'ERR_STREAM_WRITE_AFTER_END'];
            proxy.on('error', (err: any) => {
              if (ignoreCodes.includes(err?.code)) return;
              console.warn('[Vite Proxy WS Warning]', err?.message || err);
            });
            proxy.on('proxyReqWs', (proxyReq: any, _req: any, socket: any) => {
              socket?.on?.('error', (err: any) => {
                if (ignoreCodes.includes(err?.code)) return;
              });
              proxyReq?.on?.('error', (err: any) => {
                if (ignoreCodes.includes(err?.code)) return;
              });
            });
          },
        },
      },
    },
  };
});
