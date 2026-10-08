// robots.ts => genera /robots.txt según el entorno (convención de Next.js 15).
// Producción: permite rastrear el catálogo y bloquea zonas privadas/transaccionales.
// Otros entornos (staging, preview): bloquea todo para no indexar contenido de prueba (contenido duplicado).
import type { MetadataRoute } from "next";
import { config } from "@/shared/constants/config";

export default function robots(): MetadataRoute.Robots {
  // ALLOW_INDEXING=true solo en el despliegue de producción (opt-in explícito: por defecto nada se indexa)
  const indexable = process.env.ALLOW_INDEXING === "true";
  if (!indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/checkout", "/cart", "/api", "/search"],
    },
    sitemap: `${config.siteUrl}/sitemap.xml`,
  };
}
