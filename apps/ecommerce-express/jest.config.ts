// jest.config.ts (Jest + TypeScript) => configuración del runner de pruebas de ecommerce-express
// "import type" => importa SOLO el tipo (se borra al compilar, cero costo en runtime) — tipado seguro de la config
import type { Config } from "jest";

// "const" => referencia inmutable | ": Config" => anotación de tipo: TS valida cada opción contra la API de Jest
const config: Config = {
  preset: "ts-jest", // Transforma .ts con ts-jest (usa el mismo tsconfig.json => mismas reglas strict que el código)
  testEnvironment: "node", // Entorno Node (sin DOM): es un backend HTTP
  roots: ["<rootDir>/test"], // Pirámide de tests: test/unit, test/integration, test/e2e (separación por nivel, SRP)
  testMatch: ["**/*.spec.ts", "**/*.test.ts"], // Convención de nombres de archivos de prueba
  collectCoverageFrom: ["src/**/*.ts", "!src/server.ts"], // Cobertura sobre el código fuente; server.ts solo hace bootstrap
  coverageDirectory: "coverage", // Carpeta que Turborepo cachea como output de la tarea "test"
  passWithNoTests: true, // Fase 1 aún sin specs: no rompe CI mientras se escriben las pruebas
  clearMocks: true, // Limpia los mocks entre tests => cada prueba es independiente (sin estado compartido)
};

// "export default" => exportación por defecto del módulo, la forma que Jest espera para leer la config
export default config;
