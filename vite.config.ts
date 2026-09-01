import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, createLogger } from 'vite';

const customLogger = createLogger();
const originalError = customLogger.error;
customLogger.error = (msg, options) => {
  if (
    typeof msg === 'string' &&
    (msg.includes('ws proxy error') ||
     msg.includes('ECONNREFUSED') ||
     msg.includes('ECONNRESET') ||
     msg.includes('AggregateError') ||
     msg.includes('EPIPE') ||
     msg.includes('127.0.0.1:5000'))
  ) {
    return;
  }
  originalError(msg, options);
};

const originalWarn = customLogger.warn;
customLogger.warn = (msg, options) => {
  if (
    typeof msg === 'string' &&
    (msg.includes('ws proxy error') ||
     msg.includes('ECONNREFUSED') ||
     msg.includes('ECONNRESET') ||
     msg.includes('AggregateError') ||
     msg.includes('127.0.0.1:5000'))
  ) {
    return;
  }
  originalWarn(msg, options);
};

const isIgnorableProxyError = (err: any): boolean => {
  if (!err) return true;
  const ignoreCodes = ['ECONNRESET', 'ECONNABORTED', 'EPIPE', 'ECANCELED', 'ECONNREFUSED', 'ERR_STREAM_WRITE_AFTER_END', 'ENOTFOUND'];
  if (ignoreCodes.includes(err?.code)) return true;
  if (err?.name === 'AggregateError' || Array.isArray(err?.errors)) return true;
  if (typeof err?.message === 'string') {
    if (err.message.includes('ECONNREFUSED') || err.message.includes('ECONNRESET') || err.message.includes('AggregateError')) {
      return true;
    }
  }
  return false;
};

const BACKEND_TARGET = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';

export default defineConfig(() => {
  return {
    customLogger,
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
          target: BACKEND_TARGET,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err: any) => {
              if (isIgnorableProxyError(err)) return;
              console.warn('[Vite Proxy API Warning]', err?.message || err);
            });
          },
        },
        '/uploads': {
          target: BACKEND_TARGET,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err: any) => {
              if (isIgnorableProxyError(err)) return;
            });
          },
        },
        '/socket.io': {
          target: BACKEND_TARGET,
          changeOrigin: true,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err: any) => {
              if (isIgnorableProxyError(err)) return;
              console.warn('[Vite Proxy WS Warning]', err?.message || err);
            });
            proxy.on('proxyReqWs', (proxyReq: any, _req: any, socket: any) => {
              socket?.on?.('error', (err: any) => {
                if (isIgnorableProxyError(err)) return;
              });
              proxyReq?.on?.('error', (err: any) => {
                if (isIgnorableProxyError(err)) return;
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
          target: BACKEND_TARGET,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err: any) => {
              if (isIgnorableProxyError(err)) return;
              console.warn('[Vite Proxy API Warning]', err?.message || err);
            });
          },
        },
        '/uploads': {
          target: BACKEND_TARGET,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err: any) => {
              if (isIgnorableProxyError(err)) return;
            });
          },
        },
        '/socket.io': {
          target: BACKEND_TARGET,
          changeOrigin: true,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err: any) => {
              if (isIgnorableProxyError(err)) return;
              console.warn('[Vite Proxy WS Warning]', err?.message || err);
            });
            proxy.on('proxyReqWs', (proxyReq: any, _req: any, socket: any) => {
              socket?.on?.('error', (err: any) => {
                if (isIgnorableProxyError(err)) return;
              });
              proxyReq?.on?.('error', (err: any) => {
                if (isIgnorableProxyError(err)) return;
              });
            });
          },
        },
      },
    },
  };
});
