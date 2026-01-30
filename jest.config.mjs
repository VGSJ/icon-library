export default {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["src/**/*.{js,mjs}", "!src/**/index.js", "!node_modules/**"],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  transform: {
    "^.+\\.m?js$": "babel-jest",
  },
  testPathIgnorePatterns: ["/node_modules/"],
};
