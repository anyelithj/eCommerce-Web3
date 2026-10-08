// server.ts => punto de entrada REAL del proceso (lo que ejecuta "node dist/server.js" o "ts-node-dev src/server.ts").
// Orden de arranque (importa porque app.config valida process.env al importarse):
//   1. .env -> process.env
//   2. Azure opcional (AZURE_ENABLED=true): secretos de Key Vault y telemetría de Application Insights.
//      Apagado por defecto; si falla, se sigue con .env y logs locales (alternativas gratuitas).
//   3. Recién entonces se carga la aplicación (import dinámico) y se arranca.
import "dotenv/config"; // Carga las variables de .env en process.env ANTES de cualquier otro import que las use
import { initAzureMonitor, loadKeyVaultSecrets } from "./config/azure.config";

async function main(): Promise<void> {
  await loadKeyVaultSecrets();
  await initAzureMonitor(); // Antes de importar Express/http: así la telemetría puede instrumentarlos
  // "await import" => bootstrap (y con él app.config) se evalúa con el entorno ya completo
  const { bootstrap } = await import("./bootstrap");
  await bootstrap();
}

// "void" + catch => un error de arranque (config inválida, puerto ocupado) termina el proceso con código 1
void main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      level: "error",
      message: "bootstrap_failed",
      error: error instanceof Error ? error.stack : String(error),
    })
  );
  process.exit(1);
});
