const isServer = typeof window === "undefined";

const apiUrl =
  (isServer ? process.env.INTERNAL_API_URL : undefined) ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api/v1";
const graphqlUrl = new URL("/graphql", apiUrl).toString();
const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const mlApiUrl =
  process.env.NEXT_PUBLIC_ML_API_URL ||
  (new URL(publicApiUrl).port === "4000"
    ? "http://localhost:8000/api/v1/ml"
    : new URL("/ai/api/v1/ml", publicApiUrl).toString());

export const config = {
  apiUrl,
  graphqlUrl,
  graphqlWsUrl: graphqlUrl.replace(/^http/, "ws"),
  mlApiUrl,
  socketUrl: new URL(apiUrl).origin,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  cmsUrl: (process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:3001/cms").replace(/\/$/, ""),
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  siteName: "eCommerce Web3",
  defaultCurrency: "COP",
  locale: "es-CO",
  revalidateSeconds: 60,
} as const;
