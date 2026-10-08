// config.ts (Next.js) => configuración pública/servidor centralizada (DRY: ningún componente lee process.env directo).
// Las variables NEXT_PUBLIC_* se incrustan en el bundle del navegador en build time; las demás solo existen en el servidor.

// "typeof window === 'undefined'" => true en el servidor (RSC, route handlers, middleware)
const isServer = typeof window === "undefined";

// En el servidor (dentro de Docker) se usa la red interna; en el navegador, la URL pública.
// "||" (y no "??") => una variable definida pero VACÍA (INTERNAL_API_URL= en el .env, build-arg sin valor) usa el respaldo
const apiUrl =
  (isServer ? process.env.INTERNAL_API_URL : undefined) ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api/v1";
// GraphQL vive en "/graphql" del MISMO origen que la API (Express directo o el gateway Nginx): se deriva, no se configura
const graphqlUrl = new URL("/graphql", apiUrl).toString();
// Motor IA (FastAPI), solo desde el navegador: con Express directo (pnpm dev, :4000) FastAPI está en :8000; detrás del
// gateway Nginx vive en <origen>/ai/api/v1/ml (mismo origen, sin CORS). Se deriva: sin variables nuevas en el build
const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const mlApiUrl =
  process.env.NEXT_PUBLIC_ML_API_URL ||
  (new URL(publicApiUrl).port === "4000"
    ? "http://localhost:8000/api/v1/ml"
    : new URL("/ai/api/v1/ml", publicApiUrl).toString());

export const config = {
  apiUrl,
  graphqlUrl, // Queries y Mutations (HTTP)
  // Subscriptions por WebSocket: mismo endpoint con esquema ws:// (o wss:// detrás de HTTPS)
  graphqlWsUrl: graphqlUrl.replace(/^http/, "ws"),
  mlApiUrl, // Asistente LLM (chat SSE) y demás endpoints de IA
  // Socket.io de Express (feed social en vivo): mismo origen que la API, ruta /ws/socket.io
  socketUrl: new URL(apiUrl).origin,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  // Microfrontend Nuxt (contenido: landings, blog, eventos, lookbooks y panel de contenido). Detrás del gateway es el
  // MISMO origen ("/cms"); en desarrollo sin gateway, Nuxt corre en :3001 con el mismo prefijo
  cmsUrl: (process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:3001/cms").replace(/\/$/, ""),
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  siteName: "eCommerce Web3",
  defaultCurrency: "COP",
  locale: "es-CO",
  // ISR: las páginas de catálogo se regeneran cada 60 s (coherente con la cache de 60 s del backend)
  revalidateSeconds: 60,
} as const; // "as const" => propiedades de solo lectura con tipos literales
