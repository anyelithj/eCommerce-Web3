import "dotenv/config";
import { initAzureMonitor, loadKeyVaultSecrets } from "./config/azure.config";

async function main(): Promise<void> {
  await loadKeyVaultSecrets();
  await initAzureMonitor();
  const { bootstrap } = await import("./bootstrap");
  await bootstrap();
}

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
