import path from "node:path"; // Módulo nativo de Node.js para construir rutas portables (Windows/Linux)
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin"; // Conecta next-intl con el archivo que carga los diccionarios

// withNextIntl => envuelve la configuración (patrón Decorator) indicando dónde está la configuración por request
const withNextIntl = createNextIntlPlugin("./shared/lib/i18n/request.ts");

// next.config.ts => configuración del framework; "output: standalone" genera un bundle mínimo
// autocontenido ideal para Docker (no necesita copiar node_modules completo al stage de producción)
const nextConfig: NextConfig = {
  output: "standalone",
  // "outputFileTracingRoot" => raíz del monorepo; permite a Next rastrear dependencias hoisted por pnpm
  // fuera de apps/ecommerce-next (sin esto el bundle standalone queda incompleto)
  outputFileTracingRoot: path.join(__dirname, "../../"),
  images: {
    // "remotePatterns" => whitelist de dominios externos permitidos para next/image (Cloudinary, etc.)
    // Cloudinary (catálogo), avatares de proveedores OAuth (Google/GitHub/Discord) e IPFS (imágenes de insignias NFT)
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "ipfs.io", pathname: "/ipfs/**" },
    ],
  },
  // "reactStrictMode" => activa checks adicionales de React en desarrollo (detecta efectos secundarios impuros)
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
