import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      // Architectural design: for development we use Vite's proxy (with .env), whilst production use nginx docker image
      proxy: {
        '/api': {
          target: env.VITE_PROXY_BACKEND_TARGET,
          changeOrigin: true,
        },
        '/ml-service': {
          target: env.VITE_PROXY_ML_TARGET,
          changeOrigin: true,
        },
      },
    },
  };
});
