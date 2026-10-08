// not-found.tsx => página 404 personalizada por idioma (la dispara notFound() en cualquier Server Component).
import { useTranslations } from "next-intl";
import { EmptyState } from "@/shared/ui/EmptyState";

export default function NotFound() {
  const t = useTranslations("common.notFound");
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-4 py-16">
      {/* React 19 eleva <title> y <meta> al <head>: título traducido y noindex sin generateMetadata */}
      <title>{t("metaTitle")}</title>
      <meta name="robots" content="noindex" />
      <EmptyState
        icon="🔍"
        title={t("title")}
        description={t("description")}
        action={{ label: t("action"), href: "/products" }}
      />
    </main>
  );
}
