import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:3001")
    .transform((value) => value.split(",").map((origin) => origin.trim())),

  DATABASE_URL: z.string().min(1),
  MONGO_URL: z.string().default("mongodb://localhost:27017/ecommerce_docs"),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("eCommerce Web3 <no-reply@ecommerce-web3.dev>"),

  DEFAULT_CURRENCY: z.string().length(3).default("COP"),
  TAX_RATE: z.coerce.number().min(0).max(1).default(0.19),
  CHECKOUT_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  CART_TTL_DAYS: z.coerce.number().int().positive().default(30),
  LOYALTY_POINTS_PER_UNIT: z.coerce.number().int().positive().default(100_000),
  LOW_STOCK_THRESHOLD: z.coerce.number().int().min(0).default(5),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),
  AZURE_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  AZURE_KEY_VAULT_URL: z.string().url().optional(),
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().optional(),
  AZURE_COMMUNICATION_CONNECTION_STRING: z.string().optional(),
  AZURE_EMAIL_SENDER: z.string().email().optional(),

  STOREFRONT_REVALIDATE_URL: z.string().url().optional(),
  REVALIDATE_SECRET: z.string().min(16).optional(),
  FASTAPI_URL: z.string().url().default("http://localhost:8000"),
  DIAN_INVOICE_PREFIX: z.string().default("SETP"),
  DIAN_TECHNICAL_KEY: z.string().default("fc8eac422eba16e22ffd8c6f94b3f40a6e38162c"),
  DIAN_SELLER_NIT: z.string().default("900000000"),
  DIAN_ENVIRONMENT: z.enum(["1", "2"]).default("2"),
  WEB3_RPC_URL: z.string().optional(),
  WEB3_PRIVATE_KEY: z.string().optional(),
  NFT_CONTRACT_ADDRESS: z.string().optional(),
  IPFS_API_URL: z.string().optional(),
  IPFS_GATEWAY_URL: z.string().default("https://ipfs.io/ipfs"),
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
});

export type AppConfig = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(
  Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""))
);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Configuración de entorno inválida:\n${details}`);
}

export const appConfig: Readonly<AppConfig> = Object.freeze(parsed.data);

export const isProduction = appConfig.NODE_ENV === "production";
