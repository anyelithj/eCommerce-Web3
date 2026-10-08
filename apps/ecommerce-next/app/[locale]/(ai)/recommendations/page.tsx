import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { auth } from "@/shared/lib/auth-config";
import { apiRequest } from "@/shared/lib/api-client";
import { getPathname } from "@/shared/lib/i18n/navigation";
import { getIntlLocale, initPage } from "@/shared/lib/i18n/server";
import { formatDate } from "@/shared/lib/format";
import { routes } from "@/shared/constants/routes";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ProductCarousel } from "@/widgets/product/ProductCarousel";
import type { ProductCard } from "@/entities/product/model/product.types";
import type { PageProps } from "@/shared/types/next.types";

interface Recommendation {
  id: string;
  products: ProductCard[];
  reason: string;
  createdAt: string;
}

const HISTORY_SIZE = 5;

async function accessToken(): Promise<string | undefined> {
  return ((await auth()) as { accessToken?: string } | null)?.accessToken;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "recommendations" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function RecommendationsPage({ params }: PageProps) {
  const locale = await initPage(params);
  const t = await getTranslations("recommendations");
  const path = getPathname({ href: routes.recommendations, locale });
  const intlLocale = await getIntlLocale();
  const history = await apiRequest<Recommendation[]>("/recommendation", {
    token: await accessToken(),
    query: { limit: HISTORY_SIZE },
    cache: "no-store",
  })
    .then(({ data }) => data)
    .catch(() => null);

  async function generate() {
    "use server";
    await apiRequest("/recommendation/session", {
      method: "POST",
      token: await accessToken(),
      body: {},
      locale,
    });
    revalidatePath(path);
  }

  async function clearHistory() {
    "use server";
    await apiRequest("/recommendation/history", { method: "DELETE", token: await accessToken() });
    revalidatePath(path);
  }

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-slate-600">{t("subtitle")}</p>
        </div>
        <form action={generate}>
          <Button type="submit">{t("generate")}</Button>
        </form>
      </header>

      {history === null && (
        <p role="alert" className="text-sm text-red-600">
          {t("loadError")}
        </p>
      )}
      {history?.length === 0 && <EmptyState title={t("empty")} description={t("emptyHint")} />}
      {history?.map((recommendation) => (
        <article
          key={recommendation.id}
          className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4"
        >
          <p className="text-sm text-slate-700">{recommendation.reason}</p>
          <ProductCarousel
            title={t("forYou", { date: formatDate(recommendation.createdAt, intlLocale) })}
            products={recommendation.products}
          />
        </article>
      ))}
      {Boolean(history?.length) && (
        <form action={clearHistory} className="self-start">
          <Button type="submit" variant="ghost" size="sm" className="text-red-600">
            {t("clear")}
          </Button>
        </form>
      )}
    </section>
  );
}
