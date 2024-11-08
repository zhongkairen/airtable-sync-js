module.exports = [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest', // Using the latest ECMAScript version
      sourceType: 'module',
      parserOptions: {
        // Moved parserOptions here
        ecmaVersion: 2022, // Or use the version you want
        sourceType: 'module',
      },
    },
    plugins: {
      'sort-class-members': require('eslint-plugin-sort-class-members'),
      prettier: require('eslint-plugin-prettier'),
    },
    rules: {
      'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: false }],
      'sort-class-members/sort-class-members': [
        'error',
        {
          order: [
            '[static-properties]',
            '[static-methods]',
            'constructor',
            '[private-properties]',
            '[properties]',
            '[accessor-pairs]',
            '[methods]',
            '[private-methods]',
          ],
          groups: {
            'static-properties': [{ type: 'property', static: true }],
            'static-methods': [{ type: 'method', static: true }],
            properties: [{ type: 'property', static: false }],
            'accessor-pairs': [{ kind: 'get' }, { kind: 'set' }],
            methods: [{ type: 'method', static: false }],
            'private-properties': [{ type: 'property', name: '/#.*/' }],
            'private-methods': [{ type: 'method', name: '/#.*/' }],
          },
        },
      ],
      'prettier/prettier': ['error'],
    },
  },
];
