import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { learningApiPlugin } from './src/server/main';

export default defineConfig({
  plugins: [react(), learningApiPlugin()],
  base: './',
  server: {
    port: 5173,
    fs: {
      allow: ['..']
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
