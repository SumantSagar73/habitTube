import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `app/` is the separate React Native project (own repo, gitignored).
  globalIgnores(['dist', 'app']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    // Only affects dev Fast Refresh (state resets on edit), not correctness.
    rules: { 'react-refresh/only-export-components': 'warn' },
  },
  // Node-side files: Vite config, migration script, Vercel edge function
  {
    files: ['vite.config.js', 'playwright.config.js', 'migrate.js', 'api/**/*.js', 'tests/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  // Browser extension (service worker + pages)
  {
    files: ['extension/**/*.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.serviceworker, chrome: 'readonly' } },
  },
  // Service worker in public/
  {
    files: ['public/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
])
