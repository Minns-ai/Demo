import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const repoRoot = resolve(process.cwd(), '..');
  const env = loadEnv(mode, repoRoot, '');
  const apiPort = env.PORT || '3001';
  const apiTarget = env.VITE_API_PROXY_TARGET || env.API_PROXY_TARGET || `http://127.0.0.1:${apiPort}`;

  return {
    plugins: [react()],
    envDir: '..',
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
