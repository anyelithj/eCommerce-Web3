import js from "@eslint/js";
import tseslint from "typescript-eslint";

export const cleanCodeRules = {
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", ignoreRestSiblings: true },
  ],
  "@typescript-eslint/no-explicit-any": "error",
  "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
  complexity: ["warn", 10],
  "no-var": "error",
  "prefer-const": "error",
};

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
    rules: {
      ...cleanCodeRules,
      "@typescript-eslint/no-floating-promises": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["**/*.js", "**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        process: "readonly",
      },
    },
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      sourceType: "module",
      globals: { process: "readonly", console: "readonly", URL: "readonly" },
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.nuxt/**",
      "**/.output/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/target/**",
      "**/.venv/**",
      "**/next-env.d.ts",
    ],
  }
);
