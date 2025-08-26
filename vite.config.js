import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/gantt-chartmeleon.js'),
      name: 'GanttChart',
      fileName: (format) => `gantt-chartmeleon.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      // Ensure external dependencies are not bundled
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        },
        // Preserve the CSS import
        assetFileNames: (assetInfo) => {
          if (assetInfo.names.includes('gantt-chartmeleon.css')) {
            return 'gantt-chartmeleon.css';
          }
          return assetInfo.names;
        }
      }
    },
    cssCodeSplit: false,
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      },
      format: {
        comments: false
      }
    }
  },
  server: {
    port: 3000,
    open: '/demo/index.html'
  }
});
