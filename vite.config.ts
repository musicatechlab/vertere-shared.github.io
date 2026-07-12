/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(() => ({
  base: '/vertere-shared.github.io/',

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // package "main" is build/Midi.js (inlined unpatched parser). Use dist + patched midi-file.
      '@tonejs/midi': resolve(__dirname, 'node_modules/@tonejs/midi/dist/Midi.js'),
    },
  },

  worker: {
    format: 'es' as const,
  },

  build: {
    outDir: 'dist',
    target: 'es2020',
  },

  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
}));
