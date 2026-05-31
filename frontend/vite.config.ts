import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_BACKEND_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
        '/ml-service': {
          target: env.VITE_PROXY_ML_TARGET || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
