import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import pluginQuasar from '@quasar/app-vite/eslint'
import prettierSkipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import vueI18n from '@intlify/eslint-plugin-vue-i18n'
import tsParser from '@typescript-eslint/parser' // Pastikan ini ada
import tsPlugin from '@typescript-eslint/eslint-plugin' // <--- IMPORT PLUGIN TYPESCRIPT LANGSUNG

export default [
  {
    ignores: [],
  },

  ...pluginQuasar.configs.recommended(),
  js.configs.recommended,

  // Konfigurasi untuk file Vue
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: pluginVue.parser, // Gunakan vue-eslint-parser
      parserOptions: {
        parser: tsParser, // Memberitahu vue-eslint-parser untuk pakai tsParser
        project: './.quasar/tsconfig.json', // Path ke tsconfig.json yang sebenarnya
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        // Tambahkan globals lain jika diperlukan untuk file Vue
      },
    },
    plugins: {
      vue: pluginVue,
      '@typescript-eslint': tsPlugin, // Gunakan plugin TypeScript yang diimpor langsung
    },
    rules: {
      // Aturan untuk Vue
      ...pluginVue.configs['flat/essential'].rules, // Ambil aturan dari config Vue
      ...tsPlugin.configs['eslint-recommended'].rules, // Aturan dasar TS
      ...tsPlugin.configs['recommended'].rules, // Aturan recommended TS
      ...tsPlugin.configs['recommended-type-checked'].rules, // Aturan TS yang butuh tipe
      'prefer-promise-reject-errors': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      // ... aturan lain yang Anda miliki
    },
  },

  // Konfigurasi untuk file TypeScript/JavaScript biasa (non-Vue)
  {
    files: ['**/*.{ts,js,jsx,tsx}'],
    languageOptions: {
      parser: tsParser, // Langsung pakai tsParser
      parserOptions: {
        project: './.quasar/tsconfig.json', // Path ke tsconfig.json yang sebenarnya
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        process: 'readonly',
        ga: 'readonly',
        cordova: 'readonly',
        Capacitor: 'readonly',
        chrome: 'readonly',
        browser: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin, // Gunakan plugin TypeScript yang diimpor langsung
    },
    rules: {
      ...tsPlugin.configs['eslint-recommended'].rules,
      ...tsPlugin.configs['recommended'].rules,
      ...tsPlugin.configs['recommended-type-checked'].rules,
      'prefer-promise-reject-errors': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    },
  },

  // ... (blok konfigurasi lain seperti PWA, jsonforms, vue-i18n, prettier)
  // Pastikan blok ini tidak menimpa parser atau parserOptions

  {
    files: ['src-pwa/custom-service-worker.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './.quasar/tsconfig.json', // Pastikan ini menunjuk ke yang benar
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.serviceworker,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
  },

  // Align eslint to jsonforms
  {
    files: ['src/components/form/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  ...vueI18n.configs['flat/recommended'],
  {
    files: ['**/*.vue', '**/*.js'],
    rules: {
      '@intlify/vue-i18n/no-dynamic-keys': 'error',
      '@intlify/vue-i18n/no-unused-keys': [
        'error',
        {
          extensions: ['.js', '.vue'],
        },
      ],
    },
    settings: {
      'vue-i18n': {
        localeDir: './src/i18n/locales/*.{json,json5,yaml,yml}',
        messageSyntaxVersion: '^9.0.0',
      },
    },
  },

  prettierSkipFormatting,
]
