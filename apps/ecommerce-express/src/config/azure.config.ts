export const isAzureEnabled = (): boolean => process.env["AZURE_ENABLED"] === "true";

const log = (level: "info" | "warn", message: string, meta: Record<string, unknown> = {}) =>
  console[level](JSON.stringify({ level, message, ...meta, timestamp: new Date().toISOString() }));

export const toEnvName = (secretName: string): string => secretName.replace(/-/g, "_").toUpperCase();

export async function loadKeyVaultSecrets(): Promise<"key-vault" | "env"> {
  const vaultUrl = process.env["AZURE_KEY_VAULT_URL"];
  if (!isAzureEnabled() || !vaultUrl) return "env";
  try {
    const { DefaultAzureCredential } = await import("@azure/identity");
    const { SecretClient } = await import("@azure/keyvault-secrets");
    const client = new SecretClient(vaultUrl, new DefaultAzureCredential());
    let loaded = 0;
    for await (const properties of client.listPropertiesOfSecrets()) {
      if (properties.enabled === false) continue;
      const secret = await client.getSecret(properties.name);
      if (secret.value !== undefined) {
        process.env[toEnvName(properties.name)] = secret.value;
        loaded++;
      }
    }
    log("info", "azure_key_vault_loaded", { secrets: loaded });
    return "key-vault";
  } catch (error) {
    log("warn", "azure_key_vault_unavailable_using_env", { error: error instanceof Error ? error.message : String(error) });
    return "env";
  }
}

export async function initAzureMonitor(): Promise<boolean> {
  const connectionString = process.env["APPLICATIONINSIGHTS_CONNECTION_STRING"];
  if (!isAzureEnabled() || !connectionString) return false;
  try {
    const { useAzureMonitor } = await import("@azure/monitor-opentelemetry");
    useAzureMonitor({ azureMonitorExporterOptions: { connectionString } });
    log("info", "azure_monitor_enabled");
    return true;
  } catch (error) {
    log("warn", "azure_monitor_unavailable_using_logs", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
