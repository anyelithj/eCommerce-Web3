// eslint.config.mjs (ESLint 9 flat config) => reglas de ecommerce-next.
// Patrón Composition + OCP: EXTIENDE la config compartida (@ecommerce/eslint-config) sin modificarla
// y solo AGREGA lo específico de Next.js/React. Paradigma declarativo: la config es un arreglo de objetos.

// "import ... from" => ES Modules | cada import trae un preset/plugin ya instalado en el workspace
import sharedConfig from "@ecommerce/eslint-config"; // Reglas base del monorepo (TS strict, Clean Code) — DRY
import nextPlugin from "@next/eslint-plugin-next"; // Reglas oficiales de Next.js (next/image, next/link, Core Web Vitals)
import reactHooks from "eslint-plugin-react-hooks"; // Reglas de los Hooks de React (orden de llamadas, dependencias)

// "export default" => ESLint lee la exportación por defecto | "[...]" => arreglo de bloques de configuración
export default [
  // "..." (spread) => inserta todos los bloques de la config compartida, en orden
  ...sharedConfig,
  // Preset "Core Web Vitals" de Next: además marca como error lo que degrada LCP/CLS/INP (performance + SEO)
  nextPlugin.flatConfig.coreWebVitals,
  // Preset recomendado de React Hooks (rules-of-hooks + exhaustive-deps)
  reactHooks.configs["recommended-latest"],
];
