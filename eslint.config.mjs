// eslint.config.mjs (ESLint 9, flat config) => punto de entrada que ESLint encuentra al subir desde cualquier app
// "export { default } from" => sintaxis ES Modules que re-exporta la config compartida sin redefinirla
// Patrón Facade + DRY: las reglas viven en UN solo lugar (packages/eslint-config) y todas las apps Node las heredan
export { default } from "@ecommerce/eslint-config";
