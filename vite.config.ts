import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` est surchargeable pour un déploiement en sous-chemin (ex. GitHub Pages
// sur https://user.github.io/app-motorsport/ -> BASE_PATH=/app-motorsport/).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
