import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Three builds share this file: `--mode web`, `--mode ext-host`, `--mode ext-content`.
 * `pnpm build` runs all three (see scripts/build.mjs).
 *
 * The Firebase web config is never in the tree. If you made one, it is copied next to the build output:
 *   PEM_FIREBASE_CONFIG=/path/outside/the/repo/firebase-config.json  (preferred)
 *   or ./firebase-config.local.json (gitignored)
 */
function copyFirebaseConfig(outDir: string): Plugin {
  return {
    name: 'pem-copy-firebase-config',
    configureServer(server) {
      // `pnpm dev` serves the same config file the build would copy.
      server.middlewares.use('/firebase-config.json', (_req, res, next) => {
        const src = process.env.PEM_FIREBASE_CONFIG ?? resolve(import.meta.dirname, 'firebase-config.local.json');
        if (!existsSync(src)) return next();
        res.setHeader('content-type', 'application/json');
        res.end(readFileSync(src));
      });
    },
    closeBundle() {
      const src = process.env.PEM_FIREBASE_CONFIG ?? resolve(import.meta.dirname, 'firebase-config.local.json');
      if (existsSync(src)) copyFileSync(src, resolve(outDir, 'firebase-config.json'));
    },
  };
}

export default defineConfig(({ mode }) => {
  const dist = resolve(import.meta.dirname, 'dist');
  if (mode === 'web') {
    const outDir = resolve(dist, 'web');
    return {
      root: resolve(import.meta.dirname, 'src/web'),
      base: './',
      plugins: [copyFirebaseConfig(outDir)],
      build: { outDir, emptyOutDir: true, target: 'es2022' },
    };
  }
  const outDir = resolve(dist, 'extension');
  if (mode === 'ext-host') {
    return {
      root: resolve(import.meta.dirname, 'src/extension'),
      base: './',
      publicDir: resolve(import.meta.dirname, 'src/extension/public'),
      plugins: [copyFirebaseConfig(outDir)],
      build: {
        outDir,
        emptyOutDir: true,
        target: 'es2022',
        rollupOptions: {
          input: { offscreen: resolve(import.meta.dirname, 'src/extension/offscreen.html'), background: resolve(import.meta.dirname, 'src/extension/background.ts') },
          output: { entryFileNames: '[name].js', chunkFileNames: 'chunks/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' },
        },
      },
    };
  }
  // ext-content: one classic script, because content scripts cannot be ES modules.
  return {
    publicDir: false,
    build: {
      outDir,
      emptyOutDir: false,
      target: 'es2022',
      lib: { entry: resolve(import.meta.dirname, 'src/extension/content.ts'), formats: ['iife'], name: 'PlainEnglishMargin', fileName: () => 'content.js' },
    },
  };
});
