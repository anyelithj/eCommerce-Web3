// azure.config.ts => integraciones Azure OPCIONALES (opt-in) con respaldo gratuito automático.
// Regla del proyecto: Azure NO es el valor por defecto. Solo se activa con AZURE_ENABLED=true + sus credenciales;
// si está apagado, sin credenciales o Azure falla, la app sigue con la alternativa libre:
//   Key Vault (secretos)            -> variables de .env
//   Application Insights (métricas) -> logs estructurados de winston en stdout
// Se ejecuta ANTES de cargar app.config (los secretos deben estar en process.env antes de validarlo),
// por eso lee process.env directamente y registra con console (el logger aún no existe).

// isAzureEnabled => interruptor maestro; cualquier valor distinto de "true" deja Azure apagado
export const isAzureEnabled = (): boolean => process.env["AZURE_ENABLED"] === "true";

// log => JSON de una línea, mismo formato que winston en producción (indexable por cualquier colector)
const log = (level: "info" | "warn", message: string, meta: Record<string, unknown> = {}) =>
  console[level](JSON.stringify({ level, message, ...meta, timestamp: new Date().toISOString() }));

// toEnvName => los nombres de secreto en Key Vault no admiten "_": "JWT-ACCESS-SECRET" -> "JWT_ACCESS_SECRET"
export const toEnvName = (secretName: string): string =>
  secretName.replace(/-/g, "_").toUpperCase();

// loadKeyVaultSecrets => copia los secretos de Key Vault a process.env. Devuelve la fuente usada.
// Fallback: si falla (red, permisos, bóveda inexistente) se continúa con los valores del .env.
export async function loadKeyVaultSecrets(): Promise<"key-vault" | "env"> {
  const vaultUrl = process.env["AZURE_KEY_VAULT_URL"];
  if (!isAzureEnabled() || !vaultUrl) return "env";
  try {
    // "await import" => los SDK de Azure solo se cargan si Azure está activo (arranque más liviano por defecto)
    const { DefaultAzureCredential } = await import("@azure/identity");
    const { SecretClient } = await import("@azure/keyvault-secrets");
    // DefaultAzureCredential => Managed Identity en Azure; "az login" o variables AZURE_* en local
    const client = new SecretClient(vaultUrl, new DefaultAzureCredential());
    let loaded = 0;
    // "for await...of" => la API pagina los secretos; se recorren sin cargarlos todos en memoria
    for await (const properties of client.listPropertiesOfSecrets()) {
      if (properties.enabled === false) continue;
      const secret = await client.getSecret(properties.name);
      if (secret.value !== undefined) {
        process.env[toEnvName(properties.name)] = secret.value; // Key Vault tiene prioridad sobre .env
        loaded++;
      }
    }
    log("info", "azure_key_vault_loaded", { secrets: loaded });
    return "key-vault";
  } catch (error) {
    log("warn", "azure_key_vault_unavailable_using_env", {
      error: error instanceof Error ? error.message : String(error),
    });
    return "env";
  }
}

// initAzureMonitor => telemetría automática (requests, dependencias, excepciones) hacia Application Insights.
// Debe llamarse antes de importar Express/http para poder instrumentarlos. Fallback: solo logs de winston.
export async function initAzureMonitor(): Promise<boolean> {
  const connectionString = process.env["APPLICATIONINSIGHTS_CONNECTION_STRING"];
  if (!isAzureEnabled() || !connectionString) return false;
  try {
    const { useAzureMonitor } = await import("@azure/monitor-opentelemetry");
    useAzureMonitor({ azureMonitorExporterOptions: { connectionString } });
    log("info", "azure_monitor_enabled");
    return true;
  } catch (error) {
    log("warn", "azure_monitor_unavailable_using_logs", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
