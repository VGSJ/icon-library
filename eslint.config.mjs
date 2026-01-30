import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        // Node.js globals
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        global: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        // Browser globals
        document: "readonly",
        window: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        Image: "readonly",
        Blob: "readonly",
        URL: "readonly",
        ClipboardItem: "readonly",
        AbortController: "readonly",
        DOMParser: "readonly",
        performance: "readonly",
        Canvas: "readonly",
        CanvasRenderingContext2D: "readonly",
        // Jest globals
        describe: "readonly",
        test: "readonly",
        expect: "readonly",
        jest: "readonly",
        beforeEach: "readonly",
        afterAll: "readonly",
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-console": [
        "warn",
        {
          allow: ["warn", "error", "log"],
        },
      ],
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      semi: ["error", "always"],
      quotes: ["error", "double"],
      "comma-dangle": ["error", "only-multiline"],
      "no-trailing-spaces": "error",
      indent: ["error", 2],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
