import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // PROXY FOR GROQ (Fixes CORS)
          '/api/groq': {
            target: 'https://api.groq.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/groq/, ''),
            configure: (proxy, _options) => {
              proxy.on('error', (err, _req, _res) => {
                console.log('Proxy Error:', err);
              });
            }
          }
        }
      },
      plugins: [react()],
      define: {
        
        'process.env.GROQ_API_KEY': JSON.stringify(env.GROQ_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
