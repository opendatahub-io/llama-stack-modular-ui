// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: false,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of directory names to be searched recursively up from the requiring module's location
  moduleDirectories: ['node_modules', '<rootDir>/src'],

  // A map from regular expressions to module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '\\.(css|less)$': '<rootDir>/src/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/__mocks__/fileMock.js',
    "@app/(.*)": '<rootDir>/src/app/$1'
  },

  setupFilesAfterEnv: ['<rootDir>/src/__tests__/unit/jest.setup.ts'],

  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },

  transformIgnorePatterns: [
    'node_modules/(?!(\\@patternfly|@data-driven-forms|react-syntax-highlighter|remark-gfm|react-markdown|remark-parse|micromark|micromark-util.*|mdast-util.*|hast-util.*|unist-util.*|vfile.*|bail|is-plain-obj|trough|zwitch|devlop|comma-separated-tokens|estree-util-is-identifier-name|property-information|space-separated-tokens|html-url-attributes|decode-named-character-reference|micromark.*|remark-rehype|trim-lines|unified|ccount|escape-string-regexp|markdown-table|longest-streak|rehype.*|is-absolute-url)/)',
  ],

  // The test environment that will be used for testing.
  testEnvironment: 'jsdom',

  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  
  watchman: false,
};