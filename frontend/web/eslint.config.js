import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Las propiedades que se descartan al reenviar `...props` (p. ej. `wide: _wide`) no son variables sin uso.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true, varsIgnorePattern: '^_' }],
      // Regla del compilador de React: el código sincroniza estado con props y carga datos en efectos
      // (patrón extendido en el frontend completo). Se mantiene como aviso para ir migrándolos sin bloquear.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // RF-114: escenarios de Cypress (Mocha + Chai en el navegador) y su configuración en Node.
    files: ['cypress/**/*.ts', 'cypress.config.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.mocha, cy: 'readonly', Cypress: 'readonly', expect: 'readonly' },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    // RNF-18: los fixtures de Playwright llaman a `use(...)`, que no es un hook de React, y
    // declaran sin dependencias con `async ({}, use) => …`.
    files: ['e2e/**/*.ts', 'playwright.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'no-empty-pattern': 'off',
    },
  },
])
