import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react(), dts({ rollupTypes: false, tsconfigPath: resolve(__dirname, 'tsconfig.json'), outDir: resolve(__dirname, 'dist') }), cssInjectedByJsPlugin()],
  root: './demo',
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'TextBubbles',
      fileName: 'text-bubbles',
    },
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});