import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { learningApiPlugin } from './src/server/main';

export default defineConfig({
  plugins: [react(), learningApiPlugin()],
  server: {
    port: 5173,
    fs: {
      allow: ['..']
    }
  }
});
