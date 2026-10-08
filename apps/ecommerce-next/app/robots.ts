import type { MetadataRoute } from "next";
import { config } from "@/shared/constants/config";

export default function robots(): MetadataRoute.Robots {
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
