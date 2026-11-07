import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'cookie-cleaner',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // If browser has bloated cookies on localhost, aggressively send Set-Cookie expiration headers
          if (req.headers.cookie) {
            try {
              const cookies = req.headers.cookie.split(';');
              const clearHeaders = cookies.map(c => {
                const name = c.split('=')[0].trim();
                return `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`;
              });
              res.setHeader('Set-Cookie', clearHeaders);
            } catch (e) {
              console.warn('Cookie cleaner error:', e);
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    proxy: {
      '/supabase-proxy': {
        target: 'https://fkgcduzlvchjmipausde.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase-proxy/, ''),
        secure: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Strip cookie header completely so Supabase/Cloudflare never sees bloated cookies
            proxyReq.removeHeader('cookie');
          });
        }
      }
    }
  }
})
