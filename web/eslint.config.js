import path from 'node:path'
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import { defineConfig, globalIgnores } from 'eslint/config'

// Scope Next's presets (React, hooks, a11y, @next/next rules) to web/main
// only — they'd be meaningless noise in framework-free packages like web/db.
// Pure-ignore entries are left global, as the presets intend.
const scopeToMain = (configs) =>
  configs.map((c) =>
    Object.keys(c).length === 1 && c.ignores
      ? c
      : { ...c, files: ['main/**/*.{js,mjs,ts,tsx}'] },
  )

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/.next/**',
    '**/__generated__/**',
    '**/next-env.d.ts',
  ]),

  // --- All packages ---
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },

  // --- web/main (Next.js) ---
  ...scopeToMain(nextVitals),
  ...scopeToMain(nextTs),
  {
    files: ['main/**/*.{js,mjs,ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    settings: { next: { rootDir: path.join(import.meta.dirname, 'main') } },
  },
])
