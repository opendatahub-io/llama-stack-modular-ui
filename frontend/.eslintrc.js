module.exports = {
  // tells eslint to use the TypeScript parser
  "parser": "@typescript-eslint/parser",
  // tell the TypeScript parser that we want to use JSX syntax
  "parserOptions": {
    "tsx": true,
    "jsx": true,
    "js": true,
    "useJSXTextNode": true,
    "project": "./tsconfig.json",
    "tsconfigRootDir": "."
  },
  // we want to use the recommended rules provided from the typescript plugin
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "globals": {
    "window": "readonly",
    "describe": "readonly",
    "test": "readonly",
    "expect": "readonly",
    "it": "readonly",
    "process": "readonly",
    "document": "readonly",
    "insights": "readonly",
    "shallow": "readonly",
    "render": "readonly",
    "mount": "readonly"
  },
  "overrides": [
    {
      "files": ["src/**/*.ts", "src/**/*.tsx"],
      "parser": "@typescript-eslint/parser",
      "plugins": ["@typescript-eslint"],
      "extends": ["plugin:@typescript-eslint/recommended"],
      "rules": {
        "react/prop-types": "off",
        "@typescript-eslint/no-unused-vars": "error"
      },
    },
    {
      files: ['./src/__tests__/cypress/**/*.ts'],
      parserOptions: {
        project: ['./src/__tests__/cypress/tsconfig.json'],
      },
      extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
        'prettier',
        'plugin:cypress/recommended',
      ],
    },
    {
      files: ['src/__tests__/cypress/**'],
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@patternfly/**'],
                message:
                  'Cypress tests should only import mocks and types from outside the Cypress test directory.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/__tests__/cypress/**/*.js'],
      parser: 'espree',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
      },
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/dot-notation': 'off',
        '@typescript-eslint/default-param-last': 'off',
        '@typescript-eslint/method-signature-style': 'off',
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/no-unused-expressions': 'off',
        '@typescript-eslint/no-redeclare': 'off',
        '@typescript-eslint/no-shadow': 'off',
        '@typescript-eslint/return-await': 'off',
        '@typescript-eslint/no-base-to-string': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/no-unnecessary-condition': 'off',
      },
    },
  ],
  "settings": {
    "react": {
      "version": "^16.11.0"
    }
  },
  // includes the typescript specific rules found here: https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin#supported-rules
  "plugins": [
    "@typescript-eslint",
    "react-hooks",
    "eslint-plugin-react-hooks"
  ],
  "rules": {
    "sort-imports": [
      "error",
      {
        "ignoreDeclarationSort": true
      }
    ],
    "@typescript-eslint/explicit-function-return-type": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/interface-name-prefix": "off",
    "prettier/prettier": "off",
    "import/no-unresolved": "off",
    "import/extensions": "off",
    "react/prop-types": "off"
  },
  "env": {
    "browser": true,
    "node": true
  }
}
