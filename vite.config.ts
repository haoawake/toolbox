import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base 用相对路径：无论部署在 haoawake.github.io/ 还是 haoawake.github.io/toolbox/ 都能直接用。
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
  },
});
