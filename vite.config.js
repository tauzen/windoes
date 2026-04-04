import { defineConfig } from 'vite';

export default defineConfig({
    root: 'windoes',
    base: '/windoes/',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
    },
});
