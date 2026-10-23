import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Content is JSON on disk, served as-is rather than bundled: the page fetches
  // it and the harness reads the same files off disk (ADR 0009 decision 6), so
  // a content set can be revised without a rebuild.
  publicDir: 'content',
  plugins: [react(), tailwindcss()],
});
