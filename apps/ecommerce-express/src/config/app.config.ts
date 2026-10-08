// app.config.ts (TypeScript + Zod) => configuración ÚNICA de la aplicación, validada al arrancar.
// Patrón: "Fail Fast" + Singleton de configuración (12-Factor App: la config vive en variables de entorno).
// Si falta una variable obligatoria el proceso se detiene con un mensaje claro, en vez de fallar
// minutos después en el primer request que la use. Paradigma declarativo: el schema describe la config.
import "dotenv/config"; // Carga .env en process.env ANTES de validar (idempotente si server.ts ya lo cargó)
import { z } from "zod"; // Librería de validación en runtime con inferencia de tipos

// "z.coerce.number()" => convierte el string del entorno a número (process.env solo contiene strings)
// ".default(x)" => valor por defecto si la variable no existe | ".optional()" => integración desactivada si falta
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  // Lista separada por comas => se transforma en arreglo (".transform" = paso funcional de mapeo)
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:3001")
    .transform((value) => value.split(",").map((origin) => origin.trim())),

  // --- Persistencia ---
  DATABASE_URL: z.string().min(1),
  MONGO_URL: z.string().default("mongodb://localhost:27017/ecommerce_docs"),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // --- JWT ---
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // --- Correo (Nodemailer) ---
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025), // 1025 = Mailpit/MailHog en desarrollo
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("eCommerce Web3 <no-reply@ecommerce-web3.dev>"),

  // --- Comercio ---
  DEFAULT_CURRENCY: z.string().length(3).default("COP"),
  TAX_RATE: z.coerce.number().min(0).max(1).default(0.19), // IVA Colombia 19%
  CHECKOUT_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  CART_TTL_DAYS: z.coerce.number().int().positive().default(30),
  LOYALTY_POINTS_PER_UNIT: z.coerce.number().int().positive().default(100_000), // 1 punto por cada $1.000 COP (100.000 en unidad mínima)
  LOW_STOCK_THRESHOLD: z.coerce.number().int().min(0).default(5), // Unidades disponibles por debajo de las cuales se alerta

  // --- Integraciones (opcionales: sin credenciales la integración responde 503 SERVICE_UNAVAILABLE) ---
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),
  // --- Azure (OPCIONAL, apagado por defecto) ---
  // Solo "true" lo activa; sin él se usan las alternativas gratuitas (SMTP, .env, logs locales)
  AZURE_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  AZURE_KEY_VAULT_URL: z.string().url().optional(), // Lo lee azure.config.ts antes de validar este esquema
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().optional(),
  AZURE_COMMUNICATION_CONNECTION_STRING: z.string().optional(),
  AZURE_EMAIL_SENDER: z.string().email().optional(),

  // Revalidación ISR bajo demanda del storefront Next.js (POST /api/revalidate con secreto compartido)
  STOREFRONT_REVALIDATE_URL: z.string().url().optional(),
  REVALIDATE_SECRET: z.string().min(16).optional(),
  FASTAPI_URL: z.string().url().default("http://localhost:8000"),
  DIAN_INVOICE_PREFIX: z.string().default("SETP"),
  DIAN_TECHNICAL_KEY: z.string().default("fc8eac422eba16e22ffd8c6f94b3f40a6e38162c"), // Clave técnica del SET de PRUEBAS DIAN
  DIAN_SELLER_NIT: z.string().default("900000000"),
  DIAN_ENVIRONMENT: z.enum(["1", "2"]).default("2"), // 1 = producción, 2 = habilitación/pruebas
  WEB3_RPC_URL: z.string().optional(),
  WEB3_PRIVATE_KEY: z.string().optional(),
  NFT_CONTRACT_ADDRESS: z.string().optional(),
  IPFS_API_URL: z.string().optional(), // Nodo IPFS (Kubo HTTP RPC) o servicio de pinning compatible
  IPFS_GATEWAY_URL: z.string().default("https://ipfs.io/ipfs"),
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
});

// "export type" => tipo inferido del schema (DRY: el tipo y la validación no se desincronizan)
export type AppConfig = z.infer<typeof EnvSchema>;

// "safeParse" => no lanza: devuelve { success, data | error } para poder formatear el mensaje (Result pattern)
// Variables vacías ("AZURE_KEY_VAULT_URL=") => se tratan como ausentes, para que apliquen ".optional()" y ".default()"
const parsed = EnvSchema.safeParse(
  Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""))
);

// Guard clause: configuración inválida => se detiene el arranque con el detalle de cada variable
if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Configuración de entorno inválida:\n${details}`);
}

// "Object.freeze" => configuración inmutable en runtime: ningún módulo puede modificarla por accidente
export const appConfig: Readonly<AppConfig> = Object.freeze(parsed.data);

// Helper semántico usado para activar comportamientos solo en producción (ej. cookies "secure")
export const isProduction = appConfig.NODE_ENV === "production";
