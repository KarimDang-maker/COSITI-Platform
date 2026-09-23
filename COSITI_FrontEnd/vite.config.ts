import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// `vitest/config` réexporte `defineConfig` de Vite en ajoutant le typage du
// bloc `test` : un seul fichier de configuration pour Vite et Vitest.
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@marque': fileURLToPath(new URL('./COSITI_branding_pack/assets', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // Les specs Playwright (`e2e/`) importent `@playwright/test`, pas Vitest : sans cette
    // exclusion, le motif par défaut `**/*.spec.ts` les ramasserait et `npm run test`
    // échouerait sur un import incompatible. Elles se lancent par `npm run test:e2e`.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Le rendu avec les vrais fournisseurs (React Query, session, routeur) et
    // l'interception réseau MSW alourdissent chaque test ; 5 s (défaut) est
    // trop juste pour un scénario à plusieurs étapes.
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/components/ui/**', 'src/test/**', '**/*.d.ts'],
    },
  },
})
