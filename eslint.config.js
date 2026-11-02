import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/', 'web/dist/', 'node_modules/'] },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['web/public/**/*.js'],
    languageOptions: {
      globals: { document: 'readonly', localStorage: 'readonly' },
    },
  },
  {
    files: ['web/src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(\\.\\./)+src/(?!core/grid-stroke\\.ts$)',
              allowTypeImports: true,
              message:
                'The web app may only import types from the server, plus src/core/grid-stroke.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['web/src/test-setup.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' },
      ],
    },
  },
  {
    files: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [
            {
              from: 'package',
              name: ['describe', 'it'],
              package: 'node:test',
            },
          ],
        },
      ],
    },
  },
);
