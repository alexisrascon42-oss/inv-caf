import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1', // 👈 Cambia esto para que escuche en localhost
    allowedHosts: true,
    hmr: {
      host: '://trycloudflare.com',
      protocol: 'wss',
      clientPort: 443
    }
  }
});
