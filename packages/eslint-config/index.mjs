// eslint.config.mjs => "flat config", formato nuevo de ESLint 9 (reemplaza .eslintrc)
// DRY: un solo archivo de reglas importado por TODAS las apps del monorepo (Express, Next, Nuxt)
import js from "@eslint/js"; // Reglas base de JavaScript recomendadas por ESLint
import tseslint from "typescript-eslint"; // Parser + reglas específicas de TypeScript

// cleanCodeRules => reglas Clean Code que NO necesitan información de tipos. "export const" (export con nombre) =>
// ecommerce-nuxt las reutiliza sobre el parser de Vue sin heredar el parser de TS de este archivo (DRY)
export const cleanCodeRules = {
  // Prohíbe variables declaradas y no usadas => Clean Code: cero código muerto
  // "ignoreRestSiblings" => permite omitir campos con rest ({ confirmPassword: _c, ...payload }), patrón inmutable estándar
  "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
  // Prohíbe "any" implícito o explícito => tipado seguro obligatorio (regla del proyecto)
  "@typescript-eslint/no-explicit-any": "error",
  // SRP a nivel de archivo: máximo de líneas por archivo (heurística Clean Code)
  "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
  // Complejidad ciclomática máxima por función => favorece funciones pequeñas (SRP)
  complexity: ["warn", 10],
  // Prohíbe "var" (usar let/const, scoping predecible ES2022+)
  "no-var": "error",
  // Prefiere const cuando la variable nunca se reasigna (inmutabilidad por defecto)
  "prefer-const": "error",
};

export default tseslint.config(
  // Extiende las reglas recomendadas de JS y de TypeScript (Clean Code base)
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // "files" => a qué archivos aplica este bloque de reglas
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        // "project: true" => habilita reglas type-aware (analizan tipos reales, no solo sintaxis)
        project: true,
      },
    },
    rules: {
      // "..." (spread) => copia las reglas Clean Code y agrega la que SÍ necesita tipos
      ...cleanCodeRules,
      // Obliga a manejar las promesas (await/catch/void) => evita promesas huérfanas (type-aware)
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  {
    // Archivos de configuración CommonJS (postcss.config.js, commitlint.config.js): corren en Node, no en el navegador
    files: ["**/*.js", "**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs", // Habilita la semántica de módulos CommonJS (require/module.exports)
      // "globals" => variables globales de Node disponibles en CommonJS; "readonly" => no se pueden reasignar
      globals: { module: "readonly", require: "readonly", __dirname: "readonly", process: "readonly" },
    },
  },
  {
    // Scripts de mantenimiento en ES Modules (ej. scripts/check-messages.mjs): corren en Node, con sus globals
    files: ["**/*.mjs"],
    languageOptions: {
      sourceType: "module",
      globals: { process: "readonly", console: "readonly", URL: "readonly" },
    },
  },
  {
    // Carpetas ignoradas globalmente por el linter
    // "**/" => aplica en cualquier nivel del monorepo (apps/*/dist, apps/*/.next, etc.), no solo en la raíz
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
